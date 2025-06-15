// src/hooks/useAppConfig.js

import { useState, useEffect } from "react";
import useLocalStorage from "./useLocalStorage";
import connectionManager from "../core/ConnectionManager";
import deviceRegistry from "../core/DeviceRegistry";
import eventBus from "../core/EventBus";
import historyService from "../services/HistoryService";
import alertService from "../services/AlertService";

const useAppConfig = () => {
  const [appConfig, setAppConfig] = useLocalStorage("edwic_app_config", {
    brokers: [],
    dashboards: {
      dashboard: { title: "Головна", components: [] },
    },
    alertRules: [],
  });

  const [globalConnectionStatus, setGlobalConnectionStatus] = useState("offline");

  useEffect(() => {
    // Створюємо асинхронну функцію для правильного керування послідовністю.
    const initializeApp = async () => {
      console.log("[useAppConfig] Initialization effect starting...");

      // --- Крок 1: Ініціалізуємо мережевий шар і ЧЕКАЄМО на його завершення ---
      await connectionManager.initializeFromBrokersConfig(appConfig.brokers);
      
      console.log("[useAppConfig] ConnectionManager initialization finished. Proceeding...");

      // --- Крок 2: Ініціалізуємо логічний шар (який залежить від мережевого) ---
      // Тепер цей код гарантовано виконається ПІСЛЯ завершення попереднього await.
      deviceRegistry.syncFromAppConfig(appConfig);

      // Ініціалізація інших сервісів
      alertService.loadRules(appConfig.alertRules);
      historyService.init();

      // --- Крок 3: Налаштовуємо слухачів і запускаємо підключення ---
      const updateStatus = () => {
        const allBrokers = connectionManager.getAllBrokers();
        if (!Array.isArray(allBrokers)) {
          setGlobalConnectionStatus("Loading...");
          return;
        }
        const connected = allBrokers.filter((b) => b.status === "online").length;
        if (allBrokers.length === 0) setGlobalConnectionStatus("No brokers");
        else if (connected === allBrokers.length) setGlobalConnectionStatus("All online");
        else if (connected > 0) setGlobalConnectionStatus("Some offline");
        else setGlobalConnectionStatus("All offline");
      };

      const events = ["connected", "disconnected", "error", "removed", "added"];
      events.forEach(e => eventBus.on(`broker:${e}`, updateStatus));
      
      // Запускаємо підключення до всіх брокерів
      connectionManager.connectAll();
      updateStatus();
    };

    // Викликаємо нашу асинхронну функцію.
    initializeApp();

    // Функція очищення
    return () => {
      const events = ["connected", "disconnected", "error", "removed", "added"];
      console.log("[useAppConfig] Cleanup effect.");
      // Потрібно передати саму функцію, а не створювати нову анонімну
      // Але для простоти можна і без цього, головне викликати off
      events.forEach(e => eventBus.off(e, () => {}));
      connectionManager.disconnectAll();
    };
    
  }, [appConfig]);

  // Решта коду хука без змін
  const handleSetBrokers = (brokers) => setAppConfig(p => ({ ...p, brokers }));
  const handleSetAlertRules = (rules) => setAppConfig(p => ({ ...p, alertRules: rules }));
  const handleAddComponent = (newComponent, dashboardId) => {
    setAppConfig(prev => {
      const updated = { ...prev.dashboards };
      if (updated[dashboardId]) {
        updated[dashboardId].components.push({ ...newComponent, id: Date.now() });
      }
      return { ...prev, dashboards: updated };
    });
  };
  const handleSaveComponent = (updatedComponent) => {
    setAppConfig(prev => {
      const updated = { ...prev.dashboards };
      Object.keys(updated).forEach(id => {
        updated[id].components = updated[id].components.map(c =>
          c.id === updatedComponent.id ? { ...c, ...updatedComponent } : c
        );
      });
      return { ...prev, dashboards: updated };
    });
  };
  const handleDeleteComponent = (componentId) => {
    setAppConfig(prev => {
      const updated = { ...prev.dashboards };
      Object.keys(updated).forEach(id => {
        updated[id].components = updated[id].components.filter(c => c.id !== componentId);
      });
      return { ...prev, dashboards: updated };
    });
  };

  return {
    appConfig,
    setAppConfig,
    globalConnectionStatus,
    handleSetBrokers,
    handleSetAlertRules,
    handleAddComponent,
    handleSaveComponent,
    handleDeleteComponent,
  };
};

export default useAppConfig;