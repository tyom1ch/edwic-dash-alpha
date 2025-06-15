// src/hooks/useAppConfig.js
import { useState, useEffect, useRef } from "react"; // Додаємо useRef
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

  // --- ЕФЕКТ №1: КЕРУВАННЯ МЕРЕЖЕВИМИ З'ЄДНАННЯМИ ---
  // Цей ефект залежить ТІЛЬКИ від конфігурації брокерів.
  useEffect(() => {
    console.log("[useAppConfig | Network] Brokers config changed. Re-initializing connections.");
    
    // 1. Ініціалізуємо і запускаємо підключення
    connectionManager.initializeFromBrokersConfig(appConfig.brokers);
    connectionManager.connectAll();

    // 2. Налаштовуємо слухача для оновлення UI статусу
    const updateStatus = () => {
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
    updateStatus();

    // 3. Функція очищення, яка буде викликана тільки при зміні брокерів
    return () => {
      console.log("[useAppConfig | Network] Cleanup. Disconnecting all brokers.");
      events.forEach(e => eventBus.off(e, updateStatus));
      connectionManager.disconnectAll();
    };
    
  }, [appConfig.brokers]); // <-- КЛЮЧОВА ЗМІНА!

  // --- ЕФЕКТ №2: КЕРУВАННЯ ПІДПИСКАМИ ТА ЛОГІКОЮ ---
  // Цей ефект залежить від дашбордів та правил. Він не викликає перепідключення.
  useEffect(() => {
    console.log("[useAppConfig | Logic] Dashboards or rules changed. Re-syncing logic.");

    // 1. Синхронізуємо реєстр пристроїв. Це оновить підписки.
    deviceRegistry.syncFromAppConfig(appConfig);
    
    // 2. Синхронізуємо правила алертів.
    alertService.loadRules(appConfig.alertRules);

    // Ініціалізуємо історію, якщо ще не зроблено
    historyService.init();

  }, [appConfig.dashboards, appConfig.alertRules]); // <-- КЛЮЧОВА ЗМІНА!

  
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