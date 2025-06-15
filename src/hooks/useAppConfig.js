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
    dashboards: { dashboard: { title: "Головна", components: [] } },
    alertRules: [],
  });
  const [globalConnectionStatus, setGlobalConnectionStatus] = useState("offline");

  useEffect(() => {
    let isEffectActive = true;
    console.log("[useAppConfig] >>>> USE EFFECT START");

    const initializeApp = async () => {
      // Крок 1: Ініціалізуємо мережу. Це має бути швидка, синхронна операція
      // яка просто створює об'єкти клієнтів, але не підключає їх.
      connectionManager.initializeFromBrokersConfig(appConfig.brokers);
      
      console.log("[useAppConfig] ConnectionManager configured. Proceeding...");

      // Крок 2: Ініціалізуємо логіку.
      deviceRegistry.syncFromAppConfig(appConfig);
      alertService.loadRules(appConfig.alertRules);
      historyService.init();

      // Крок 3: Запускаємо підключення.
      // Цей виклик асинхронний, але ми не будемо його чекати тут.
      connectionManager.connectAll();
    };

    // Обробник для оновлення статусу в UI.
    const updateStatus = () => {
        if (!isEffectActive) return; 
        const allBrokers = connectionManager.getAllBrokers();
        if (!Array.isArray(allBrokers)) {
            setGlobalConnectionStatus("Loading...");
            return;
        }
        const connected = allBrokers.filter(b => b.status === "online").length;
        if (allBrokers.length === 0) setGlobalConnectionStatus("No brokers");
        else if (connected === allBrokers.length) setGlobalConnectionStatus("All online");
        else if (connected > 0) setGlobalConnectionStatus("Some offline");
        else setGlobalConnectionStatus("All offline");
    };

    const events = ["connected", "disconnected", "error", "removed", "added"];
    events.forEach(e => eventBus.on(`broker:${e}`, updateStatus));
    
    // Запускаємо весь процес.
    initializeApp();
    updateStatus(); // Початковий виклик

    // Головна функція очищення.
    return () => {
      console.log("[useAppConfig] <<<< CLEANUP RUNNING");
      isEffectActive = false; 

      events.forEach(e => eventBus.off(e, updateStatus));
      connectionManager.disconnectAll();
    };
    
  }, [appConfig]);
  // Решта коду хука без змін...
  const handleSetBrokers = (brokers) => setAppConfig(p => ({ ...p, brokers }));
  const handleSetAlertRules = (rules) => setAppConfig(p => ({ ...p, alertRules: rules }));
  const handleAddComponent = (newComponent, dashboardId) => setAppConfig(p => {
    const dashboards = {...p.dashboards};
    if (dashboards[dashboardId]) dashboards[dashboardId].components.push({...newComponent, id: Date.now()});
    return {...p, dashboards};
  });
  const handleSaveComponent = (updatedComponent) => setAppConfig(p => {
    const dashboards = {...p.dashboards};
    Object.keys(dashboards).forEach(id => {
      dashboards[id].components = dashboards[id].components.map(c => c.id === updatedComponent.id ? {...c, ...updatedComponent} : c);
    });
    return {...p, dashboards};
  });
  const handleDeleteComponent = (componentId) => setAppConfig(p => {
    const dashboards = {...p.dashboards};
    Object.keys(dashboards).forEach(id => {
      dashboards[id].components = dashboards[id].components.filter(c => c.id !== componentId);
    });
    return {...p, dashboards};
  });

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