// src/App.jsx
import React, { useState, useMemo, useEffect } from "react";
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  StyledEngineProvider,
  CircularProgress,
  Box,
} from "@mui/material";
import { BrowserRouter as Router } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";

import useLocalStorage from "./hooks/useLocalStorage";
import useAppConfig from "./hooks/useAppConfig";
import AppLayout from "./components/AppLayout";
import CoreServices from "./core/CoreServices"; // Імпортуємо наш новий сервіс

import { useNotifications } from "@toolpad/core/useNotifications";
import eventBus from "./core/EventBus";

// Глобальний прапорець, щоб ініціалізація відбулася лише один раз
let appInitialized = false;

const App = () => {
  const [themeMode] = useLocalStorage("themeMode", "light");
  const theme = useMemo(
    () => createTheme({ palette: { mode: themeMode } }),
    [themeMode]
  );

  // Стан, який контролює, чи готова програма до рендерингу
  const [isInitialized, setIsInitialized] = useState(appInitialized);
  const notifications = useNotifications();

  // Логіка для StatusBar залишається без змін
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
    hideStatusBar();
    window.addEventListener("click", hideStatusBar);
    return () => window.removeEventListener("click", hideStatusBar);
  }, []);

  const { appConfig, setAppConfig, globalConnectionStatus, handlers } =
    useAppConfig();

  useEffect(() => {
    // Перевіряємо глобальний прапорець, щоб уникнути повторної ініціалізації
    if (!appInitialized) {
      console.log("App.jsx: Ініціалізація Core Services...");

      // Викликаємо ініціалізатор з конфігурацією, завантаженою з хука
      CoreServices.initialize(appConfig);

      eventBus.on("broker:connected", (brokerId) => {
        appInitialized = true;
        setIsInitialized(true);
      });
    }
  }, [appConfig]); // Залежність гарантує, що код виконається з уже завантаженим конфігом

  useEffect(() => {
    if (appInitialized) {
      if (globalConnectionStatus === "All online") {
        notifications.show("З'єднання встановлено", {
          severity: "info",
          autoHideDuration: 3000,
        });
      } else {
        notifications.show("З'єднання втрачено", {
          severity: "error",
          autoHideDuration: 3000,
        });
      }
    }
  }, [globalConnectionStatus]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />

      <Router>
        <AppLayout
          appConfig={appConfig}
          setAppConfig={setAppConfig}
          globalConnectionStatus={globalConnectionStatus}
          handlers={handlers}
        />
      </Router>
    </ThemeProvider>
  );
};

export default App;
