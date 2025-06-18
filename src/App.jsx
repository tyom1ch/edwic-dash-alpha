// src/App.jsx
import React, { useMemo } from "react";
import { createTheme, ThemeProvider, CssBaseline, StyledEngineProvider } from "@mui/material";
import { BrowserRouter as Router } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { StatusBar } from "@capacitor/status-bar";

import useLocalStorage from "./hooks/useLocalStorage";
import useAppConfig from "./hooks/useAppConfig";
import AppLayout from "./components/AppLayout";

import './core/DiscoveryService'; // Імпортуємо DiscoveryService для ініціалізації

// --- Функції Capacitor ---
if (Capacitor.isNativePlatform()) {
  try {
    StatusBar.hide();
  } catch (e) {
    console.warn("StatusBar.hide() failed:", e);
  }
}

const App = () => {
  const [themeMode] = useLocalStorage("themeMode", "light");
  const theme = useMemo(() => createTheme({ palette: { mode: themeMode } }), [themeMode]);

  // Вся складна логіка тепер інкапсульована в цьому хуці
  const { appConfig, setAppConfig, globalConnectionStatus, ...handlers } = useAppConfig();

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppLayout
            appConfig={appConfig}
            setAppConfig={setAppConfig}
            globalConnectionStatus={globalConnectionStatus}
            {...handlers}
          />
        </Router>
        {/* <AlertNotification /> */}
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;