// src/App.jsx
import React, { useMemo, useEffect } from "react";
import { createTheme, ThemeProvider, CssBaseline, StyledEngineProvider } from "@mui/material";
import { BrowserRouter as Router } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { StatusBar } from "@capacitor/status-bar";

import useLocalStorage from "./hooks/useLocalStorage";
import useAppConfig from "./hooks/useAppConfig";
import AppLayout from "./components/AppLayout";
import connectionManager from "./core/ConnectionManager"; // Імпортуємо наш синглтон
import eventBus from "./core/EventBus"; // Імпортуємо EventBus

import './core/DiscoveryService'; // Імпортуємо DiscoveryService для ініціалізації

// --- ВИНОСИМО ЛОГІКУ КЕРУВАННЯ З'ЄДНАННЯМИ ЗА МЕЖІ КОМПОНЕНТА ---
let isInitialized = false; // Прапорець, щоб ініціалізація відбулася лише один раз

const initializeConnections = (config) => {
  if (config && config.brokers && !isInitialized) {
    console.log("App is mounting, initializing connections for the first time.");
    connectionManager.updateBrokers(config.brokers);
    isInitialized = true;
  }
};

const App = () => {
  // --- Функції Capacitor ---
 useEffect(() => {
    const setupNativeSettings = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Приховуємо статус-бар. На Android це працює надійно.
          await StatusBar.hide();

          // Для iOS можна додатково встановити стиль, якщо статус-бар частково видимий
          if (Capacitor.getPlatform() === 'ios') {
            await StatusBar.setStyle({ style: Style.Dark });
          }

          // Приховуємо сплеш-скрін, коли додаток готовий
          await SplashScreen.hide();

        } catch (e) {
          console.error("Failed to apply native settings:", e);
        }
      }
    };

    setupNativeSettings();
  }, []);
  
  const [themeMode] = useLocalStorage("themeMode", "light");
  const theme = useMemo(() => createTheme({ palette: { mode: themeMode } }), [themeMode]);

  // Цей хук тепер відповідає лише за дані та їх збереження
  const { appConfig, setAppConfig, globalConnectionStatus, ...handlers } = useAppConfig();

  // --- ВИКОРИСТОВУЄМО useEffect ДЛЯ РЕАКЦІЇ НА ЗМІНИ КОНФІГУРАЦІЇ ---
  useEffect(() => {
    // Початкова ініціалізація при завантаженні додатка
    initializeConnections(appConfig);

    // Функція, яка буде викликатися при зміні конфігурації
    const handleConfigChange = (newConfig) => {
      console.log("App detected config change, updating connection manager.");
      // Передаємо оновлену конфігурацію брокерів в ConnectionManager
      connectionManager.updateBrokers(newConfig.brokers || []);
      // Повідомляємо інші сервіси (напр., DiscoveryService) про оновлення
      eventBus.emit('config:updated', newConfig);
    };

    // Підписуємось на подію зміни конфігу, яку генерує useAppConfig
    eventBus.on('config:saved', handleConfigChange);

    // Відписуємось при розмонтуванні компонента
    return () => {
      eventBus.off('config:saved', handleConfigChange);
    };
  }, [appConfig]); // Залежність потрібна для першого запуску

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppLayout
            appConfig={appConfig}
            setAppConfig={setAppConfig} // setAppConfig тепер має відправляти подію 'config:saved'
            globalConnectionStatus={globalConnectionStatus}
            {...handlers}
          />
        </Router>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;