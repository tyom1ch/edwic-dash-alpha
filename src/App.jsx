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
import CoreServices from './core/CoreServices'; // Імпортуємо наш новий сервіс

// Глобальний прапорець, щоб ініціалізація відбулася лише один раз
let appInitialized = false;

const App = () => {
  // Стан, який контролює, чи готова програма до рендерингу
  const [isInitialized, setIsInitialized] = useState(appInitialized);

  // Логіка для StatusBar залишається без змін
  const hideStatusBar = async () => {
    if (Capacitor.isNativePlatform()) {
      try { await StatusBar.hide(); } catch (e) { console.error("Failed to hide status bar:", e); }
    }
  };
  useEffect(() => {
    hideStatusBar();
    window.addEventListener("click", hideStatusBar);
    return () => window.removeEventListener("click", hideStatusBar);
  }, []);

  // Логіка теми залишається без змін
  const [themeMode] = useLocalStorage("themeMode", "light");
  const theme = useMemo(() => createTheme({ palette: { mode: themeMode } }), [themeMode]);

  // Хук useAppConfig, як і раніше, керує станом конфігурації
  const { appConfig, setAppConfig, globalConnectionStatus, handlers } = useAppConfig();

  // --- КЛЮЧОВИЙ ЕФЕКТ ---
  // Цей useEffect керує ініціалізацією всього додатку.
  useEffect(() => {
    // Перевіряємо глобальний прапорець, щоб уникнути повторної ініціалізації
    if (!appInitialized) {
      console.log("App.jsx: Ініціалізація Core Services...");
      
      // Викликаємо ініціалізатор з конфігурацією, завантаженою з хука
      CoreServices.initialize(appConfig);
      
      // Встановлюємо глобальний прапорець
      appInitialized = true;
      
      // Оновлюємо стан React, щоб дозволити рендеринг основного додатку
      setIsInitialized(true);
    }
  }, [appConfig]); // Залежність гарантує, що код виконається з уже завантаженим конфігом

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          {isInitialized ? (
            // Якщо все готово, рендеримо AppLayout
            <AppLayout
              appConfig={appConfig}
              setAppConfig={setAppConfig}
              globalConnectionStatus={globalConnectionStatus}
              handlers={handlers}
            />
          ) : (
            // В іншому випадку показуємо індикатор завантаження
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress />
            </Box>
          )}
        </Router>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;