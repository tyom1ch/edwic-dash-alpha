// src/hooks/useAppConfig.js
import { useState, useEffect, useCallback, useMemo } from "react";
import { getAppConfig, saveAppConfig } from "../core/db";
import eventBus from "../core/EventBus";
import connectionManager from "../core/ConnectionManager";
// +++ ІМПОРТУЄМО РЕЄСТР ВІДЖЕТІВ +++
import { getWidgetById } from "../core/widgetRegistry";

// Початкова конфігурація
const initialConfig = {
  brokers: [],
  dashboards: {
    "dashboard-1": {
      title: "Головний",
      components: [],
    },
  },
};

const useAppConfig = () => {
  const [appConfig, setAppConfigState] = useState(initialConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [brokerStatuses, setBrokerStatuses] = useState({});

  useEffect(() => {
    const loadConfig = async () => {
      let savedConfig = await getAppConfig();
      
      // Fallback to localStorage migration temporarily if Dexie is empty
      if (!savedConfig) {
        try {
            const lsConfig = localStorage.getItem("appConfig");
            if (lsConfig) {
                savedConfig = JSON.parse(lsConfig);
                // Save it to dexie for future
                await saveAppConfig(savedConfig);
            }
        } catch(e) {
            console.warn("Failed to migrate from localStorage:", e);
        }
      }

      if (savedConfig) {
        // Strip out the dexie 'id' if restoring
        const { id, ...restConfig } = savedConfig;
        setAppConfigState(restConfig);
      }
      setIsLoading(false);
    };
    loadConfig();
  }, []);
  const setAppConfig = useCallback(
    (value) => {
      const newConfig = typeof value === "function" ? value(appConfig) : value;
      setAppConfigState(newConfig);
      saveAppConfig(newConfig); // Async save to Dexie
      eventBus.emit("config:saved", newConfig);
    },
    [appConfig]
  );

  const [brokerErrors, setBrokerErrors] = useState({});

  const globalConnectionStatus = useMemo(() => {
    if (!appConfig.brokers || appConfig.brokers.length === 0) {
      return "offline";
    }
    
    let connectedCount = 0;
    let connectingCount = 0;
    let errorCount = 0;

    appConfig.brokers.forEach((b) => {
      const status = brokerStatuses[b.id] || "offline";
      if (status === "connected") connectedCount++;
      else if (status === "connecting" || status === "reconnecting") connectingCount++;
      else if (status === "error") errorCount++;
    });

    if (connectedCount === appConfig.brokers.length) return "connected";
    if (connectedCount > 0) return "partial";
    if (connectingCount > 0) return "connecting";
    return "offline";
  }, [appConfig.brokers, brokerStatuses]);

  useEffect(() => {
    if (isLoading) return;

    const handleConnect = (brokerId) => {
      setBrokerStatuses((prev) => ({ ...prev, [brokerId]: "connected" }));
      setBrokerErrors((prev) => ({ ...prev, [brokerId]: null }));
    };

    const handleDisconnect = (brokerId) => {
      setBrokerStatuses((prev) => ({ ...prev, [brokerId]: "offline" }));
    };

    const handleError = (brokerId, err) => {
      setBrokerStatuses((prev) => ({ ...prev, [brokerId]: "error" }));
      setBrokerErrors((prev) => ({ ...prev, [brokerId]: err?.message || "Помилка з'єднання" }));
    };

    const handleReconnecting = (brokerId) => {
      setBrokerStatuses((prev) => ({ ...prev, [brokerId]: "connecting" }));
    };

    eventBus.on("broker:connected", handleConnect);
    eventBus.on("broker:disconnected", handleDisconnect);
    eventBus.on("broker:error", handleError);
    eventBus.on("broker:reconnecting", handleReconnecting);

    if (appConfig.brokers) {
      const initialStatuses = {};
      appConfig.brokers.forEach((b) => {
        initialStatuses[b.id] = connectionManager.isConnected(b.id)
          ? "connected"
          : "offline"; // ConnectionManager could be queried for exact states if we expand it, but offline is a safe default before events fire.
      });
      setBrokerStatuses(initialStatuses);
    }

    return () => {
      eventBus.off("broker:connected", handleConnect);
      eventBus.off("broker:disconnected", handleDisconnect);
      eventBus.off("broker:error", handleError);
      eventBus.off("broker:reconnecting", handleReconnecting);
    };
  }, [appConfig.brokers, isLoading]);
  
  const handleSetBrokers = useCallback((newBrokers) => {
    setAppConfig((prev) => ({ ...prev, brokers: newBrokers }));
  }, [setAppConfig]);

  // +++ ОСЬ ГОЛОВНИЙ ФІКС +++
  const handleAddComponent = useCallback((newComponent, dashboardId) => {
    // 1. Знаходимо визначення віджета в реєстрі
    const widgetDef = getWidgetById(newComponent.type);
    let generatedConfig = {};

    // 2. Якщо для цього віджета є функція getTopicMappings, викликаємо її,
    // щоб отримати згенеровану конфігурацію (з топіками, brightness: true і т.д.)
    if (widgetDef && widgetDef.getTopicMappings) {
        generatedConfig = widgetDef.getTopicMappings(newComponent);
    }
    
    // 3. Створюємо фінальний об'єкт для збереження, правильно зливаючи конфігурації
    const componentToAdd = {
        ...generatedConfig, // Спочатку йде згенерована конфігурація (з brightness: true)
        ...newComponent,    // Потім йде конфігурація з Discovery (з uniq_id, name)
        id: `comp-${Date.now()}` // Додаємо унікальний ID
    };

    setAppConfig((prev) => {
      const newDashboards = { ...prev.dashboards };
      if (newDashboards[dashboardId]) {
        newDashboards[dashboardId].components.push(componentToAdd);
      }
      return { ...prev, dashboards: newDashboards };
    });
  }, [setAppConfig]);
  // +++ КІНЕЦЬ ФІКСУ +++

  const handleDeleteComponent = useCallback((componentId) => {
    setAppConfig((prev) => {
      const newDashboards = { ...prev.dashboards };
      for (const dashId in newDashboards) {
        newDashboards[dashId].components = newDashboards[dashId].components.filter((c) => c.id !== componentId);
      }
      return { ...prev, dashboards: newDashboards };
    });
  }, [setAppConfig]);

  const handleSaveComponent = useCallback((updatedComponent) => {
    setAppConfig((prev) => {
      const newDashboards = { ...prev.dashboards };
      for (const dashId in newDashboards) {
        const index = newDashboards[dashId].components.findIndex((c) => c.id === updatedComponent.id);
        if (index !== -1) {
          newDashboards[dashId].components[index] = updatedComponent;
          break;
        }
      }
      return { ...prev, dashboards: newDashboards };
    });
  }, [setAppConfig]);

  return {
    appConfig,
    isLoading,
    setAppConfig,
    globalConnectionStatus,
    brokerStatuses,
    brokerErrors,
    handlers: {
      handleSetBrokers,
      handleAddComponent,
      handleDeleteComponent,
      handleSaveComponent,
    },
  };
};

export default useAppConfig;