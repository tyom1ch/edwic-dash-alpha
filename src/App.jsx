import React, { useEffect, useState } from "react";
import {
  Experimental_CssVarsProvider as CssVarsProvider,
  createTheme,
  useTheme
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

  // 2. Persist user selection
  useEffect(() => {
    localStorage.setItem("toolpad-mode", themeMode);
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

  // A component inside the provider to access the dynamically resolved theme properties
  const EdgeToEdgeThemeSync = () => {
    const activeTheme = useTheme();
    useEffect(() => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Identify if MUI is currently rendering dark or light
          const isDark = activeTheme.palette.mode === 'dark';
          
          // Force edge-to-edge background to be completely transparent (#00000000)
          // This allows the root React Box (`bgcolor: background.default`) to visibly fill the entire screen behind the safe areas.
          EdgeToEdge.setBackgroundColor({ color: '#00000000' }).catch(console.error);
          
          // Style.Dark means 'dark background' so icons should be light, and vice versa.
          const iconStyle = isDark ? Style.Dark : Style.Light;
          StatusBar.setStyle({ style: iconStyle }).catch(console.error);
        } catch (e) {
          console.error("Failed to sync EdgeToEdge colors", e);
        }
      }
    }, [activeTheme]);
    
    return null;
  };

  return (
    <CssVarsProvider theme={theme} defaultMode={themeMode} modeStorageKey="toolpad-mode">
      <CssBaseline enableColorScheme />
      <EdgeToEdgeThemeSync />
      {isLoading ? (
        <Box sx={{ 
          display: 'flex', 
          minHeight: '100dvh', 
          width: '100vw',
          justifyContent: 'center', 
          alignItems: 'center',
          bgcolor: 'background.default',
          color: 'text.primary',
          transition: 'background-color 0.3s',
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