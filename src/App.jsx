// src/App.jsx
import React, { useMemo, useEffect } from "react";
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  StyledEngineProvider,
} from "@mui/material";
import { BrowserRouter as Router } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";

import useLocalStorage from "./hooks/useLocalStorage";
import useAppConfig from "./hooks/useAppConfig";
import AppLayout from "./components/AppLayout";
import connectionManager from "./core/ConnectionManager"; // Імпортуємо наш синглтон
import eventBus from "./core/EventBus"; // Імпортуємо EventBus

import "./core/DiscoveryService"; // Імпортуємо DiscoveryService для ініціалізації

// --- ВИНОСИМО ЛОГІКУ КЕРУВАННЯ З'ЄДНАННЯМИ ЗА МЕЖІ КОМПОНЕНТА ---
let isInitialized = false; // Прапорець, щоб ініціалізація відбулася лише один раз

const initializeConnections = (config) => {
  if (config && config.brokers && !isInitialized) {
    console.log(
      "App is mounting, initializing connections for the first time."
    );
    connectionManager.updateBrokers(config.brokers);
    isInitialized = true;
  }
};

const App = () => {
  const hideStatusBar = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.hide();
      } catch (e) {
        console.error("Failed to hide status bar:", e);
      }
    }
  };

  useEffect(() => {
    // Сховати при старті
    hideStatusBar();

    // Повісити на всі кліки
    window.addEventListener("click", hideStatusBar);

    return () => {
      window.removeEventListener("click", hideStatusBar);
    };
  }, []);

  const [themeMode] = useLocalStorage("themeMode", "light");
  const theme = useMemo(
    () => createTheme({ palette: { mode: themeMode } }),
    [themeMode]
  );

  // Цей хук тепер відповідає лише за дані та їх збереження
  const { appConfig, setAppConfig, globalConnectionStatus, ...handlers } =
    useAppConfig();

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
      eventBus.emit("config:updated", newConfig);
    };

    // Підписуємось на подію зміни конфігу, яку генерує useAppConfig
    eventBus.on("config:saved", handleConfigChange);

    // Відписуємось при розмонтуванні компонента
    return () => {
      eventBus.off("config:saved", handleConfigChange);
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
