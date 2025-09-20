// src/hooks/useAppConfig.js
import { useState, useEffect, useCallback, useMemo } from "react";
import useLocalStorage from "./useLocalStorage";
import eventBus from "../core/EventBus";
import connectionManager from "../core/ConnectionManager";
// +++ ІМПОРТУЄМО РЕЄСТР ВІДЖЕТІВ +++
import { getWidgetById } from "../core/widgetRegistry";

// Початкова конфігурація залишається тут
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
  const [storedConfig, setStoredConfig] = useLocalStorage(
    "appConfig",
    initialConfig
  );
  const [appConfig, setAppConfigState] = useState(storedConfig);

  const [brokerStatuses, setBrokerStatuses] = useState({});

  const setAppConfig = useCallback(
    (value) => {
      const newConfig = typeof value === "function" ? value(appConfig) : value;
      setAppConfigState(newConfig);
      setStoredConfig(newConfig);
      eventBus.emit("config:saved", newConfig);
    },
    [appConfig, setStoredConfig]
  );

  const globalConnectionStatus = useMemo(() => {
    if (!appConfig.brokers || appConfig.brokers.length === 0) {
      return "Not Configured";
    }
    const statuses = appConfig.brokers.map(
      (b) => brokerStatuses[b.id] || "offline"
    );
    if (statuses.every((s) => s === "online")) return "All online";
    if (statuses.some((s) => s === "online")) return "Partially online";
    return "All offline";
  }, [appConfig.brokers, brokerStatuses]);

  useEffect(() => {
    const updateStatusForBroker = (brokerId) => {
      const status = connectionManager.isConnected(brokerId)
        ? "online"
        : "offline";
      setBrokerStatuses((prev) => ({ ...prev, [brokerId]: status }));
    };

    const handleConnect = (brokerId) => updateStatusForBroker(brokerId);
    const handleDisconnect = (brokerId) => updateStatusForBroker(brokerId);

    eventBus.on("broker:connected", handleConnect);
    eventBus.on("broker:disconnected", handleDisconnect);

    if (appConfig.brokers) {
      const initialStatuses = {};
      appConfig.brokers.forEach((b) => {
        initialStatuses[b.id] = connectionManager.isConnected(b.id)
          ? "online"
          : "offline";
      });
      setBrokerStatuses(initialStatuses);
    }

    return () => {
      eventBus.off("broker:connected", handleConnect);
      eventBus.off("broker:disconnected", handleDisconnect);
    };
  }, [appConfig.brokers]);
  
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
    setAppConfig,
    globalConnectionStatus,
    handlers: {
      handleSetBrokers,
      handleAddComponent,
      handleDeleteComponent,
      handleSaveComponent,
    },
  };
};

export default useAppConfig;