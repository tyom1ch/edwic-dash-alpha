// src/hooks/useAppConfig.js
import { useState, useEffect, useCallback, useMemo } from "react";
import { getAppConfig, saveAppConfig } from "../core/db";
import eventBus from "../core/EventBus";
import connectionManager from "../core/ConnectionManager";
import { getWidgetById } from "../core/widgetRegistry";

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

// ─── initial config ──────────────────────────────────────────────────────────

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

// ─── hook ────────────────────────────────────────────────────────────────────

const useAppConfig = () => {
  const [appConfig, setAppConfigState] = useState(initialConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [brokerStatuses, setBrokerStatuses] = useState({});
  const [brokerErrors, setBrokerErrors] = useState({});

  // Load & migrate on mount
  useEffect(() => {
    const loadConfig = async () => {
      let savedConfig = await getAppConfig();

      if (!savedConfig) {
        try {
          const lsConfig = localStorage.getItem("appConfig");
          if (lsConfig) {
            savedConfig = JSON.parse(lsConfig);
            await saveAppConfig(savedConfig);
          }
        } catch (e) {
          console.warn("Failed to migrate from localStorage:", e);
        }
      }

      if (savedConfig) {
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
      }
      setIsLoading(false);
    };
    loadConfig();
  }, []);

  const setAppConfig = useCallback(
    (value) => {
      if (typeof value === "function") {
        // Always use functional form so React guarantees latest state
        setAppConfigState((prev) => {
          const next = value(prev);
          // Side-effects: persist & notify (async, after render)
          Promise.resolve().then(() => {
            saveAppConfig(next);
            eventBus.emit("config:saved", next);
          });
          return next;
        });
      } else {
        setAppConfigState(value);
        saveAppConfig(value);
        eventBus.emit("config:saved", value);
      }
    },
    [] // no deps needed since we only use the setter (stable) and async effects
  );

  // ─── broker status tracking ────────────────────────────────────────────────

  const globalConnectionStatus = useMemo(() => {
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
  }, [appConfig.brokers, brokerStatuses]);

  useEffect(() => {
    if (isLoading) return;
    const on = (brokerId) => setBrokerStatuses((p) => ({ ...p, [brokerId]: "connected" }));
    const off = (brokerId) => setBrokerStatuses((p) => ({ ...p, [brokerId]: "offline" }));
    const err = (brokerId, e) => {
      setBrokerStatuses((p) => ({ ...p, [brokerId]: "error" }));
      setBrokerErrors((p) => ({ ...p, [brokerId]: e?.message || "Помилка" }));
    };
    const rc = (brokerId) => setBrokerStatuses((p) => ({ ...p, [brokerId]: "connecting" }));

    eventBus.on("broker:connected", on);
    eventBus.on("broker:disconnected", off);
    eventBus.on("broker:error", err);
    eventBus.on("broker:reconnecting", rc);

    if (appConfig.brokers) {
      const init = {};
      appConfig.brokers.forEach((b) => {
        init[b.id] = connectionManager.isConnected(b.id) ? "connected" : "offline";
      });
      setBrokerStatuses(init);
    }

    return () => {
      eventBus.off("broker:connected", on);
      eventBus.off("broker:disconnected", off);
      eventBus.off("broker:error", err);
      eventBus.off("broker:reconnecting", rc);
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

  /** sectionId: if provided, add to that section; else add to first section */
  const handleAddComponent = useCallback(
    (newComponent, dashboardId, sectionId) => {
      const widgetDef = getWidgetById(newComponent.type);
      let generatedConfig = {};
      if (widgetDef?.getTopicMappings) {
        generatedConfig = widgetDef.getTopicMappings(newComponent);
      }
      // Stamp HA grid_options so the card knows its own size
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

  // ─── return ────────────────────────────────────────────────────────────────

  return {
    appConfig,
    isLoading,
    setAppConfig,
    globalConnectionStatus,
    brokerStatuses,
    brokerErrors,
    handlers: {
      handleSetBrokers,
      handleSetAlerts,
      handleFinishWelcome,
      handleAddComponent,
      handleDeleteComponent,
      handleSaveComponent,
      handleAddSection,
      handleDeleteSection,
      handleRenameSection,
    },
  };
};

export default useAppConfig;