// src/hooks/useAppConfig.js
import { useState, useEffect } from "react";
import useLocalStorage from "./useLocalStorage";
import connectionManager from "../core/ConnectionManager";
import deviceRegistry from "../core/DeviceRegistry";
import eventBus from "../core/EventBus";
import alertService from "../services/AlertService";

const useAppConfig = () => {
  const [appConfig, setAppConfig] = useLocalStorage("edwic_app_config", {
    brokers: [],
    dashboards: { dashboard: { title: "Головна", components: [] } },
    alertRules: [],
  });
  const [globalConnectionStatus, setGlobalConnectionStatus] = useState("offline");

  // Ефект для керування мережевими з'єднаннями
  useEffect(() => {
    console.log("[useAppConfig | Network] Brokers config changed. Re-initializing connections.");
    connectionManager.initializeFromBrokersConfig(appConfig.brokers);
    connectionManager.connectAll();

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

    return () => {
      console.log("[useAppConfig | Network] Cleanup. Disconnecting all brokers.");
      events.forEach(e => eventBus.off(`broker:${e}`, updateStatus));
      connectionManager.disconnectAll();
    };
  }, [appConfig.brokers]);

  // Ефект для керування логікою та підписками
  useEffect(() => {
    console.log("[useAppConfig | Logic] Dashboards or rules changed. Re-syncing logic.");
    deviceRegistry.syncFromAppConfig(appConfig);
    alertService.loadRules(appConfig.alertRules);
  }, [appConfig.dashboards, appConfig.alertRules]);

  
  // --- ОБРОБНИКИ ЗМІНИ ДАНИХ ---
  const handleSetBrokers = (brokers) => setAppConfig(p => ({ ...p, brokers }));
  const handleSetAlertRules = (rules) => setAppConfig(p => ({ ...p, alertRules: rules }));

  const handleAddComponent = (newComponentData, dashboardId) => {
    const newComponent = {
      ...newComponentData,
      id: newComponentData.id || `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      layout: { x: 0, y: 0, w: 2, h: 2 },
    };
    
    deviceRegistry.addEntityAndSubscribe(newComponent);
    
    setAppConfig(prev => {
      const updatedConfig = { ...prev };
      const targetDashboard = updatedConfig.dashboards[dashboardId];
      if (targetDashboard) {
        targetDashboard.components = [...targetDashboard.components, newComponent];
      }
      return updatedConfig;
    });
  };

  const handleSaveComponent = (updatedComponent) => {
    let oldComponent = null;
    Object.values(appConfig.dashboards).forEach(d => {
        const found = d.components.find(c => c.id === updatedComponent.id);
        if (found) oldComponent = found;
    });

    if (oldComponent && oldComponent.state_topic !== updatedComponent.state_topic) {
        console.log(`[useAppConfig] Topic changed for ${updatedComponent.id}. Resubscribing.`);
        deviceRegistry.removeEntityAndUnsubscribe(oldComponent.id);
        deviceRegistry.addEntityAndSubscribe(updatedComponent);
    } else if (oldComponent) {
        deviceRegistry.addEntity(updatedComponent);
    }
    
    setAppConfig(p => {
        const dashboards = { ...p.dashboards };
        Object.keys(dashboards).forEach(id => {
          dashboards[id].components = dashboards[id].components.map(c => c.id === updatedComponent.id ? { ...c, ...updatedComponent } : c);
        });
        return { ...p, dashboards };
    });
  };

  const handleDeleteComponent = (componentId) => {
    deviceRegistry.removeEntityAndUnsubscribe(componentId);
    
    setAppConfig(p => {
      const dashboards = { ...p.dashboards };
      Object.keys(dashboards).forEach(id => {
        dashboards[id].components = dashboards[id].components.filter(c => c.id !== componentId);
      });
      return { ...p, dashboards };
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