import React, { useEffect, useState, useMemo } from "react";
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  StyledEngineProvider,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// --- Імпорти Нового Ядра ---
import connectionManager from './core/ConnectionManager';
import deviceRegistry from './core/DeviceRegistry';
import eventBus from './core/EventBus';
import historyService from './services/HistoryService';
import alertService from './services/AlertService';
// ------------------------

import useLocalStorage from "./hooks/useLocalStorage";

// --- Імпорти Сторінок та Компонентів ---
// Переконайтеся, що ці файли існують за вказаними шляхами
// та містять відповідні компоненти.
import BrokersPage from './pages/BrokersPage'; // Для керування кількома брокерами, якщо буде
import DashboardPage from './pages/DashboardPage'; // Обгортка для основного дашборда
import SettingsPage from './pages/SettingsPage'; // Твоя адаптована сторінка налаштувань брокера
import AlertRulesPage from './pages/AlertRulesPage'; // Сторінка для правил алертів

import AlertNotification from "./components/AlertNotification"; // Для відображення сповіщень

// Додаткові компоненти UI, які можуть імпортуватися звідси або з відповідних сторінок/компонентів
// import ComponentDialog from "./components/ComponentDialog";
// import Dashboard from "./components/Dashboard"; // Main dashboard grid
// import ModalDashSettings from "./components/ModalDashSettings";
// import SettingsButton from "./components/SettingsButton";

// Capacitor imports
import { StatusBar } from "@capacitor/status-bar";
import { Capacitor } from '@capacitor/core';

// --- Функції Capacitor (умовне використання) ---
const hideStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.hide();
    } catch (e) {
      console.warn("StatusBar.hide() not available or failed:", e);
    }
  }
};

const App = () => {
  // --- UI States ---
  const [themeMode] = useLocalStorage("themeMode", "light");
  const theme = useMemo(
    () => createTheme({ palette: { mode: themeMode } }),
    [themeMode]
  );

  // Глобальна конфігурація дашборда (з localStorage)
  // Включає брокерів, дашборди з компонентами, правила алертів
  const [appConfig, setAppConfig] = useLocalStorage("edwic_app_config", {
    brokers: [],
    dashboards: {
      'dashboard': { title: "Головна", components: [] }, // Змінено ID на 'dashboard'
    },
    alertRules: [],
  });

  const [globalConnectionStatus, setGlobalConnectionStatus] = useState('offline');

  // --- useEffect для ініціалізації ядра та слухачів ---
  useEffect(() => {
        console.log("App.jsx useEffect triggered. appConfig.brokers:", appConfig.brokers); // <-- ДОДАЙТЕ ЦЕЙ РЯДОК

    // 1. Ініціалізуємо ConnectionManager з поточною конфігурацією брокерів
    connectionManager.initializeFromBrokersConfig(appConfig.brokers);

    // 2. Синхронізуємо DeviceRegistry з компонентами дашборда
    deviceRegistry.syncFromAppConfig(appConfig);

    // 3. Ініціалізуємо AlertService з правилами з localStorage
    alertService.loadRules(appConfig.alertRules);

    // 4. Ініціалізуємо HistoryService
    //    Оскільки InfluxDB конфігурації немає, ініціалізуємо без неї,
    //    HistoryService буде працювати тільки з IndexedDB.
    historyService.init();

    // 5. Встановлюємо слухачів для оновлення глобального статусу підключення UI
    const updateGlobalStatus = () => {
      const allBrokers = connectionManager.getAllBrokers();
      if (!Array.isArray(allBrokers)) {
        console.warn("ConnectionManager.getAllBrokers() did not return an array yet. Setting status to 'Loading...'.", allBrokers);
        setGlobalConnectionStatus('Loading...');
        return;
      }

      const connectedCount = allBrokers.filter(b => b.status === 'online').length;
      if (allBrokers.length === 0) {
        setGlobalConnectionStatus('No brokers configured');
      } else if (connectedCount === allBrokers.length) {
        setGlobalConnectionStatus('All online');
      } else if (connectedCount > 0) {
        setGlobalConnectionStatus('Some offline');
      } else {
        setGlobalConnectionStatus('All offline');
      }
    };

    eventBus.on('broker:connected', updateGlobalStatus);
    eventBus.on('broker:disconnected', updateGlobalStatus);
    eventBus.on('broker:error', updateGlobalStatus);
    eventBus.on('broker:removed', updateGlobalStatus);
    eventBus.on('broker:added', updateGlobalStatus);

    // Capacitor: сховати статус-бар при запуску (умовно)
    hideStatusBar();

    // Cleanup function: відключити MQTT-з'єднання та видалити слухачів при розмонтуванні App
    return () => {
      connectionManager.disconnectAll();
      eventBus.off('broker:connected', updateGlobalStatus);
      eventBus.off('broker:disconnected', updateGlobalStatus);
      eventBus.off('broker:error', updateGlobalStatus);
      eventBus.off('broker:removed', updateGlobalStatus);
      eventBus.off('broker:added', updateGlobalStatus);
    };
  }, [appConfig]); // Залежить від змін усієї конфігурації App

  // --- Функції для оновлення appConfig (передаються дочірнім компонентам) ---
  // Ця функція тепер оновлює brokers в appConfig
  const handleSetBrokers = (newBrokers) => {
    setAppConfig(prev => ({ ...prev, brokers: newBrokers }));
  };

  const handleSetDashboards = (newDashboards) => {
    setAppConfig(prev => ({ ...prev, dashboards: newDashboards }));
  };

  const handleSetAlertRules = (newRules) => {
    setAppConfig(prev => ({ ...prev, alertRules: newRules }));
    alertService.loadRules(newRules); // Оновити правила в AlertService одразу
  };

  // Видалили handleSetInfluxdbConfig, оскільки InfluxDB більше не налаштовується через UI
  // const handleSetInfluxdbConfig = (newInfluxConfig) => { ... };

  // --- Функції керування компонентами дашборда (віджетами) ---
  const getDashboardById = (dashboardId) => appConfig.dashboards[dashboardId];

  const handleAddComponent = (newComponent, dashboardId) => {
      const targetDashboardId = dashboardId || Object.keys(appConfig.dashboards)[0];
      setAppConfig(prev => {
          const updatedDashboards = { ...prev.dashboards };
          if (updatedDashboards[targetDashboardId]) {
              const newId = String(Date.now());
              updatedDashboards[targetDashboardId].components.push({ ...newComponent, id: newId });
          }
          return { ...prev, dashboards: updatedDashboards };
      });
  };

  const handleSaveComponent = (updatedComponent, dashboardId) => {
      const targetDashboardId = dashboardId || Object.keys(appConfig.dashboards)[0];
      setAppConfig(prev => {
          const updatedDashboards = { ...prev.dashboards };
          if (updatedDashboards[targetDashboardId]) {
              updatedDashboards[targetDashboardId].components = updatedDashboards[targetDashboardId].components.map(comp =>
                  String(comp.id) === String(updatedComponent.id) ? { ...comp, ...updatedComponent } : comp
              );
          }
          return { ...prev, dashboards: updatedDashboards };
      });
  };

  const handleDeleteComponent = (componentId, dashboardId) => {
      const targetDashboardId = dashboardId || Object.keys(appConfig.dashboards)[0];
      setAppConfig(prev => {
          const updatedDashboards = { ...prev.dashboards };
          if (updatedDashboards[targetDashboardId]) {
              updatedDashboards[targetDashboardId].components = updatedDashboards[targetDashboardId].components.filter(comp =>
                  String(comp.id) !== String(componentId)
              );
          }
          return { ...prev, dashboards: updatedDashboards };
      });
  };

  // --- Компонент-обгортка для Роутів ---
  const AppContent = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Визначення поточного дашборда з URL
    const currentDashboardId = location.pathname.split('/')[1] || Object.keys(appConfig.dashboards)[0] || 'default-dashboard';
    const currentDashboard = getDashboardById(currentDashboardId);

    // Логіка початкової навігації
    useEffect(() => {
        if (location.pathname === '/' && Object.keys(appConfig.dashboards).length > 0) {
            navigate(`/${Object.keys(appConfig.dashboards)[0]}`);
        } else if (Object.keys(appConfig.dashboards).length === 0 && location.pathname !== '/settings') { // Змінено '/settings/brokers' на '/settings'
            navigate('/settings'); // Перенаправлення на основну сторінку налаштувань
        }
    }, [appConfig.dashboards, navigate, location.pathname]);


    return (
        <>
            {/* Глобальний статус бар MQTT */}
            <Box sx={{ padding: '10px', background: '#e0e0e0', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" component="span" sx={{ mr: 1 }}>
                    Статус MQTT:
                </Typography>
                <Typography variant="body1" component="span" sx={{ color:
                    globalConnectionStatus === 'All online' ? 'green' :
                    globalConnectionStatus === 'Some offline' ? 'orange' : 'red'
                }}>
                    {globalConnectionStatus}
                </Typography>
                <Box>
                    <Button onClick={() => navigate(`/${Object.keys(appConfig.dashboards)[0] || 'default-dashboard'}`)}>Дашборд</Button>
                    {/* Кнопка на "Загальні налаштування" */}
                    <Button onClick={() => navigate('/settings')}>Налаштування</Button>
                    <Button onClick={() => navigate('/settings/alerts')}>Алерти</Button>
                </Box>
            </Box>

            {/* Основні маршрути */}
            <Routes>
                {/* Маршрут '/' веде на DashboardPage */}
                <Route path="/" element={
                    <DashboardPage
                        dashboard={currentDashboard}
                        onAddComponent={(newComp) => handleAddComponent(newComp, currentDashboardId)}
                        onSaveComponent={(updComp) => handleSaveComponent(updComp, currentDashboardId)}
                        onDeleteComponent={(compID) => handleDeleteComponent(compID, currentDashboardId)}
                    />
                } />
                {/* Маршрут для налаштувань брокерів (якщо ти будеш мати BrokersPage для кількох брокерів) */}
                {/* Я залишаю цей маршрут, але твоя поточна SettingsPage його не використовує */}
                <Route path="/settings/brokers" element={
                    <BrokersPage
                        brokers={appConfig.brokers}
                        setBrokers={handleSetBrokers}
                    />
                } />
                {/* Маршрут для загальних налаштувань (твоя SettingsPage) */}
                <Route path="/settings" element={
                    <SettingsPage
                        brokers={appConfig.brokers} // Передаємо сюди конфігурацію брокерів
                        setBrokers={handleSetBrokers} // Передаємо функцію для її оновлення
                        // influxdbConfig={appConfig.influxdb} // Цей пропс більше не потрібен в SettingsPage
                        // onSetInfluxdbConfig={handleSetInfluxdbConfig} // Цей пропс більше не потрібен в SettingsPage
                    />
                } />
                {/* Маршрут для правил алертів */}
                <Route path="/settings/alerts" element={
                    <AlertRulesPage
                        alertRules={appConfig.alertRules}
                        onSetAlertRules={handleSetAlertRules}
                    />
                } />
                {/* Динамічні маршрути для інших дашбордів */}
                {Object.keys(appConfig.dashboards).map(dashboardId => (
                    <Route
                        key={dashboardId}
                        path={`/${dashboardId}`}
                        element={
                            <DashboardPage
                                dashboard={getDashboardById(dashboardId)}
                                onAddComponent={(newComp) => handleAddComponent(newComp, dashboardId)}
                                onSaveComponent={(updComp) => handleSaveComponent(updComp, dashboardId)}
                                onDeleteComponent={(compID) => handleDeleteComponent(compID, dashboardId)}
                            />
                        }
                    />
                ))}
                {/* Якщо не знайдено маршруту */}
                <Route path="*" element={<div>404 - Сторінку не знайдено</div>} />
            </Routes>
        </>
    );
  };

  return (
    <StyledEngineProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router> {/* BrowserRouter обгортає AppContent */}
          <AppContent />
        </Router>
        <AlertNotification /> {/* Компонент сповіщень про алерти */}
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;