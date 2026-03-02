import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getAppConfig, saveAppConfig } from "../core/db";
import eventBus from "../core/EventBus";
import connectionManager from "../core/ConnectionManager";
import { getWidgetById } from "../core/widgetRegistry";

export const AppConfigContext = createContext();

// ─── helpers ────────────────────────────────────────────────────────────────

const makeSection = (title = "Нова секція", cards = []) => ({
  id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title,
  column_span: 1,
  cards,
});

/** Migrate old flat `components[]` to a single default section */
const migrateDashboard = (dashboard) => {
  if (dashboard.sections) return dashboard; // already migrated
  const cards = dashboard.components || [];
  return {
    ...dashboard,
    sections: [makeSection("Головний", cards)],
    components: undefined, // clean up old key
  };
};

const initialConfig = {
  hasSeenWelcome: false,
  autoConnect: true,
  brokers: [],
  alerts: [],
  dashboards: {
    "dashboard-1": {
      title: "Головний",
      sections: [makeSection("Головний")],
    },
  },
};

// ─── Provider ──────────────────────────────────────────────────────────────

export const AppConfigProvider = ({ children }) => {
  const [appConfig, setAppConfigState] = useState(initialConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [brokerStatuses, setBrokerStatuses] = useState({});
  const [brokerErrors, setBrokerErrors] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ref to store the previous config for comparison during save
  const prevAppConfigRef = useRef();

  // Helper to count widgets in a config
  const countWidgets = useCallback((cfg) => {
    let count = 0;
    Object.values(cfg.dashboards || {}).forEach(d => {
      (d.sections || []).forEach(s => { count += (s.cards || []).length; }); // Changed components to cards
    });
    return count;
  }, []);

  // Custom save function that includes widget count tracking and reconnect logic
  const saveAppConfig = useCallback(async (newConfig) => {
    try {
      // 1) Find which brokers need a reconnect (if new widgets were added)
      const oldConfig = prevAppConfigRef.current || {};
      const brokersToReconnect = new Set();
      
      const oldWidgets = countWidgets(oldConfig);
      const newWidgets = countWidgets(newConfig);

      // If we added new widgets, blindly reconnect all active brokers that have this widget 
      // (simplification: just reconnect all configured brokers for a fresh state)
      if (newWidgets > oldWidgets) {
        (newConfig.brokers || []).forEach(b => brokersToReconnect.add(b.id));
      }

      await db.saveAppConfig(newConfig); // Use the original db save function
      setAppConfigState(newConfig); // Update local state
      eventBus.emit("config:saved", newConfig);
      
      // Execute the reconnects slightly after config saving
      setTimeout(() => {
        brokersToReconnect.forEach(brokerId => {
          connectionManager.triggerReconnect(brokerId);
        });
      }, 500);

      return true;
    } catch (error) {
      console.error("Помилка збереження конфігурації:", error);
      return false;
    }
  }, [countWidgets]);


  // Load & migrate on mount
  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      let savedConfig = await getAppConfig();

      if (!savedConfig) {
        try {
          const lsConfig = localStorage.getItem("appConfig");
          if (lsConfig) {
            savedConfig = JSON.parse(lsConfig);
            await db.saveAppConfig(savedConfig); // Use db.saveAppConfig here
          }
        } catch (e) {
          console.warn("Failed to migrate from localStorage:", e);
        }
      }

      if (mounted && savedConfig) {
        const { id, ...restConfig } = savedConfig;
        
        // If config existed but didn't have hasSeenWelcome, default to true 
        // because it's an existing user migrating to the new version.
        const hasSeenWelcome = restConfig.hasSeenWelcome ?? true;

        // Migrate every dashboard
        const migratedDashboards = {};
        for (const dashId in restConfig.dashboards) {
          migratedDashboards[dashId] = migrateDashboard(restConfig.dashboards[dashId]);
        }
        setAppConfigState({ 
            hasSeenWelcome,
            ...restConfig, 
            alerts: restConfig.alerts || [],
            dashboards: migratedDashboards 
        });

        const initialStatuses = {};
        (restConfig.brokers || []).forEach(b => {
          initialStatuses[b.id] = (restConfig.autoConnect !== false) ? 'connecting' : 'offline';
        });
        setBrokerStatuses(initialStatuses);
      }
      if (mounted) setIsLoading(false);
    };
    loadConfig();
    return () => { mounted = false; };
  }, []);

  // Side-effect to persist and notify
  useEffect(() => {
    if (isLoading) return;
    saveAppConfig(appConfig);
    eventBus.emit("config:saved", appConfig);
  }, [appConfig, isLoading]);

  const setAppConfig = useCallback((valueOrFn) => {
    setAppConfigState(valueOrFn);
  }, []);

  // ─── broker status tracking ────────────────────────────────────────────────

  const globalConnectionStatus = useMemo(() => {
    if (isRefreshing) return "refreshing";
    if (!appConfig.brokers || appConfig.brokers.length === 0) return "offline";
    let connected = 0, connecting = 0;
    appConfig.brokers.forEach((b) => {
      const s = brokerStatuses[b.id] || "offline";
      if (s === "connected") connected++;
      else if (s === "connecting" || s === "reconnecting") connecting++;
    });
    if (connected === appConfig.brokers.length) return "connected";
    if (connected > 0) return "partial";
    if (connecting > 0) return "connecting";
    return "offline";
  }, [appConfig.brokers, brokerStatuses, isRefreshing]);

  useEffect(() => {
    if (isLoading) return;
    const on = (brokerId) => setBrokerStatuses((p) => ({ ...p, [brokerId]: "connected" }));
    const off = (brokerId) => setBrokerStatuses((p) => ({ ...p, [brokerId]: "offline" }));
    const err = (brokerId, e) => {
      setBrokerStatuses((p) => ({ ...p, [brokerId]: "error" }));
      setBrokerErrors((p) => ({ ...p, [brokerId]: e?.message || "Помилка" }));
    };
    const rc = (brokerId) => setBrokerStatuses((p) => ({ ...p, [brokerId]: "connecting" }));

    let refreshingStartTime = 0;
    let refreshingTimeout = null;

    const rsOn = () => {
      refreshingStartTime = Date.now();
      setIsRefreshing(true);
      if (refreshingTimeout) clearTimeout(refreshingTimeout);
    };

    const rsOff = () => {
      const elapsed = Date.now() - refreshingStartTime;
      const remaining = Math.max(0, 1000 - elapsed);
      refreshingTimeout = setTimeout(() => {
        setIsRefreshing(false);
      }, remaining);
    };

    eventBus.on("broker:connected", on);
    eventBus.on("broker:disconnected", off);
    eventBus.on("broker:error", err);
    eventBus.on("broker:reconnecting", rc);
    eventBus.on("app:refreshing_start", rsOn);
    eventBus.on("app:refreshing_end", rsOff);

    if (appConfig.brokers) {
      const initStatuses = {};
      appConfig.brokers.forEach((b) => {
        initStatuses[b.id] = connectionManager.isConnected(b.id) ? "connected" : "offline";
      });
      setBrokerStatuses(initStatuses);
    }

    return () => {
      eventBus.off("broker:connected", on);
      eventBus.off("broker:disconnected", off);
      eventBus.off("broker:error", err);
      eventBus.off("broker:reconnecting", rc);
      eventBus.off("app:refreshing_start", rsOn);
      eventBus.off("app:refreshing_end", rsOff);
    };
  }, [appConfig.brokers, isLoading]);

  // ─── broker & alert handlers ────────────────────────────────────────────────────────

  const handleSetBrokers = useCallback(
    (newBrokers) => setAppConfig((prev) => ({ ...prev, brokers: newBrokers })),
    [setAppConfig]
  );

  const handleSetAlerts = useCallback(
    (newAlerts) => setAppConfig((prev) => ({ ...prev, alerts: newAlerts })),
    [setAppConfig]
  );

  const handleFinishWelcome = useCallback(
    () => setAppConfig((prev) => ({ ...prev, hasSeenWelcome: true })),
    [setAppConfig]
  );

  // ─── section handlers ──────────────────────────────────────────────────────

  const handleAddSection = useCallback(
    (dashboardId) => {
      setAppConfig((prev) => {
        const dash = prev.dashboards[dashboardId];
        if (!dash) return prev;
        const updated = {
          ...dash,
          sections: [...(dash.sections || []), makeSection()],
        };
        return { ...prev, dashboards: { ...prev.dashboards, [dashboardId]: updated } };
      });
    },
    [setAppConfig]
  );

  const handleDeleteSection = useCallback(
    (dashboardId, sectionId) => {
      setAppConfig((prev) => {
        const dash = prev.dashboards[dashboardId];
        if (!dash) return prev;
        const updated = {
          ...dash,
          sections: dash.sections.filter((s) => s.id !== sectionId),
        };
        return { ...prev, dashboards: { ...prev.dashboards, [dashboardId]: updated } };
      });
    },
    [setAppConfig]
  );

  const handleRenameSection = useCallback(
    (dashboardId, sectionId, newTitle) => {
      setAppConfig((prev) => {
        const dash = prev.dashboards[dashboardId];
        if (!dash) return prev;
        const updated = {
          ...dash,
          sections: dash.sections.map((s) =>
            s.id === sectionId ? { ...s, title: newTitle } : s
          ),
        };
        return { ...prev, dashboards: { ...prev.dashboards, [dashboardId]: updated } };
      });
    },
    [setAppConfig]
  );

  // ─── component (card) handlers ─────────────────────────────────────────────

  const handleAddComponent = useCallback(
    (newComponent, dashboardId, sectionId) => {
      const widgetDef = getWidgetById(newComponent.type);
      
      const hasTopics = Object.keys(newComponent).some(k => k.endsWith('_topic') || k.endsWith('_t'));
      
      let generatedConfig = {};
      if (widgetDef?.getTopicMappings && !hasTopics) {
        generatedConfig = widgetDef.getTopicMappings(newComponent);
      }
      
      const grid_options =
        newComponent.grid_options ??
        widgetDef?.defaultGridOptions ??
        { columns: 1, rows: 1 };
        
      const componentToAdd = {
        ...generatedConfig,
        ...newComponent,
        grid_options,
        id: `comp-${Date.now()}`,
      };

      setAppConfig((prev) => {
        const dash = prev.dashboards[dashboardId];
        if (!dash) return prev;
        const sections = (dash.sections || []).map((sec, idx) => {
          const isTarget = sectionId ? sec.id === sectionId : idx === 0;
          if (!isTarget) return sec;
          return { ...sec, cards: [...sec.cards, componentToAdd] };
        });
        return {
          ...prev,
          dashboards: { ...prev.dashboards, [dashboardId]: { ...dash, sections } },
        };
      });
    },
    [setAppConfig]
  );

  const handleDeleteComponent = useCallback(
    (componentId) => {
      setAppConfig((prev) => {
        const newDashboards = { ...prev.dashboards };
        for (const dashId in newDashboards) {
          const dash = newDashboards[dashId];
          newDashboards[dashId] = {
            ...dash,
            sections: (dash.sections || []).map((sec) => ({
              ...sec,
              cards: sec.cards.filter((c) => c.id !== componentId),
            })),
          };
        }
        return { ...prev, dashboards: newDashboards };
      });
    },
    [setAppConfig]
  );

  const handleSaveComponent = useCallback(
    (updatedComponent) => {
      setAppConfig((prev) => {
        const newDashboards = { ...prev.dashboards };
        for (const dashId in newDashboards) {
          const dash = newDashboards[dashId];
          newDashboards[dashId] = {
            ...dash,
            sections: (dash.sections || []).map((sec) => ({
              ...sec,
              cards: sec.cards.map((c) =>
                c.id === updatedComponent.id ? updatedComponent : c
              ),
            })),
          };
        }
        return { ...prev, dashboards: newDashboards };
      });
    },
    [setAppConfig]
  );

  const handlers = useMemo(() => ({
    handleSetBrokers,
    handleSetAlerts,
    handleFinishWelcome,
    handleAddComponent,
    handleDeleteComponent,
    handleSaveComponent,
    handleAddSection,
    handleDeleteSection,
    handleRenameSection,
  }), [
    handleSetBrokers, handleSetAlerts, handleFinishWelcome,
    handleAddComponent, handleDeleteComponent, handleSaveComponent,
    handleAddSection, handleDeleteSection, handleRenameSection
  ]);

  const value = useMemo(() => ({
    appConfig,
    isLoading,
    setAppConfig,
    globalConnectionStatus,
    brokerStatuses,
    brokerErrors,
    handlers,
  }), [appConfig, isLoading, setAppConfig, globalConnectionStatus, brokerStatuses, brokerErrors, handlers]);

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
};
