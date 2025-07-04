// src/hooks/useAppConfig.js
import { useState, useEffect, useCallback, useMemo } from "react";
import useLocalStorage from "./useLocalStorage";
import eventBus from "../core/EventBus";
import connectionManager from "../core/ConnectionManager";

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

  // Ця функція тепер єдина точка, що змінює конфіг.
  // Вона оновлює стан React, localStorage і сповіщає CoreServices.
  const setAppConfig = useCallback(
    (value) => {
      const newConfig = typeof value === "function" ? value(appConfig) : value;
      setAppConfigState(newConfig);
      setStoredConfig(newConfig);
      // Просто відправляємо подію. Решту зробить CoreServices.
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

  // Ефект для відстеження статусу брокерів (залишається без змін)
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
  
  // Обробники CRUD-операцій залишаються тут, вони керують станом UI
  const handleSetBrokers = useCallback((newBrokers) => {
    setAppConfig((prev) => ({ ...prev, brokers: newBrokers }));
  }, [setAppConfig]);

  const handleAddComponent = useCallback((newComponent, dashboardId) => {
    const componentToAdd = { ...newComponent, id: `comp-${Date.now()}` };
    setAppConfig((prev) => {
      const newDashboards = { ...prev.dashboards };
      if (newDashboards[dashboardId]) {
        newDashboards[dashboardId].components.push(componentToAdd);
      }
      return { ...prev, dashboards: newDashboards };
    });
  }, [setAppConfig]);

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

  // Ефекти для синхронізації, які раніше були тут, тепер не потрібні,
  // оскільки CoreServices централізовано обробляє подію 'config:saved'.

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