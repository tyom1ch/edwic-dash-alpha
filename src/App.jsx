import React, { useEffect, useState } from "react";
import {
  Experimental_CssVarsProvider as CssVarsProvider,
  createTheme,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { BrowserRouter as Router } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import useAppConfig from "./hooks/useAppConfig";
import eventBus from "./core/EventBus";
import CoreServices from "./core/CoreServices";
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const App = () => {
  const [themeMode, setThemeMode] = useState(
    localStorage.getItem("toolpad-mode") || "system"
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const { appConfig, isLoading, setAppConfig, globalConnectionStatus, ...handlers } =
    useAppConfig();

  // 1. Run immediately on app boot to prevent Android from drawing solid bars
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      EdgeToEdge.enable().catch(console.error);
    }
  }, []);

  // 2. Sync system bar icons with the theme
  useEffect(() => {
    localStorage.setItem("toolpad-mode", themeMode);

    if (Capacitor.isNativePlatform()) {
      const isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const style = isDark ? Style.Dark : Style.Light;
      StatusBar.setStyle({ style }).catch(console.error);
    }
  }, [themeMode]);

  // 3. Initialize Core Services once config is loaded
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      CoreServices.initialize(appConfig);
      setIsInitialized(true);
    }
  }, [appConfig, isLoading, isInitialized]);



  const theme = createTheme({
    cssVarPrefix: "toolpad",
    colorSchemes: {
      light: {},
      dark: {},
    },
  });

  return (
    <CssVarsProvider theme={theme} defaultMode={themeMode} modeStorageKey="toolpad-mode">
      <CssBaseline enableColorScheme />
      {isLoading ? (
        <Box sx={{ 
          display: 'flex', 
          minHeight: '100dvh', 
          width: '100vw',
          justifyContent: 'center', 
          alignItems: 'center',
          bgcolor: 'background.default',
          color: 'text.primary',
          pt: 'env(safe-area-inset-top, 0px)',
          pb: 'env(safe-area-inset-bottom, 0px)',
          pl: 'env(safe-area-inset-left, 0px)',
          pr: 'env(safe-area-inset-right, 0px)'
        }}>
          <CircularProgress />
        </Box>
      ) : (
        <Router>
          <AppLayout
            appConfig={appConfig}
            setAppConfig={setAppConfig}
            globalConnectionStatus={globalConnectionStatus}
            {...handlers}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
          />
        </Router>
      )}
    </CssVarsProvider>
  );
};

export default App;