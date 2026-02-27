import React, { useEffect, useState } from "react";
import {
  Experimental_CssVarsProvider as CssVarsProvider,
  createTheme,
  useTheme,
  useColorScheme
} from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import CssBaseline from "@mui/material/CssBaseline";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import WelcomePage from "./pages/WelcomePage";
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

  const { 
    appConfig, 
    isLoading, 
    setAppConfig, 
    globalConnectionStatus, 
    brokerStatuses, 
    brokerErrors, 
    handlers 
  } = useAppConfig();

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

  // Native reactivity sync component decoupled from MUI's delayed theme resolution
  const EdgeToEdgeThemeSync = ({ appThemeMode }) => {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    useEffect(() => {
      if (Capacitor.isNativePlatform()) {
        try {
          const isDark = appThemeMode === 'system' ? prefersDarkMode : appThemeMode === 'dark';
          const bgColor = isDark ? '#121212' : '#ffffff'; 
          
          EdgeToEdge.setBackgroundColor({ color: bgColor }).catch(console.error);
          
          // Style.Dark means 'dark background' so icons should be light, and vice versa.
          const iconStyle = isDark ? Style.Dark : Style.Light;
          StatusBar.setStyle({ style: iconStyle }).catch(console.error);
        } catch (e) {
          console.error("Failed to sync EdgeToEdge colors", e);
        }
      }
    }, [appThemeMode, prefersDarkMode]);
    
    return null;
  };

  return (
    <CssVarsProvider theme={theme} defaultMode={themeMode} modeStorageKey="toolpad-mode">
      <CssBaseline enableColorScheme />
      <EdgeToEdgeThemeSync appThemeMode={themeMode} />
      {isLoading ? (
        <Box sx={{ 
          display: 'flex', 
          minHeight: '100dvh', 
          width: '100vw',
          justifyContent: 'center', 
          alignItems: 'center',
          bgcolor: 'background.default',
          color: 'text.primary',
          transition: 'background-color 0.3s'
        }}>
          <CircularProgress />
        </Box>
      ) : (
        <Router>
          {!appConfig.hasSeenWelcome ? (
            <Routes>
              <Route path="*" element={
                <WelcomePage 
                  setAppConfig={setAppConfig} 
                  handleFinishWelcome={handlers.handleFinishWelcome} 
                />
              } />
            </Routes>
          ) : (
            <AppLayout
              appConfig={appConfig}
              setAppConfig={setAppConfig}
              globalConnectionStatus={globalConnectionStatus}
              brokerStatuses={brokerStatuses}
              brokerErrors={brokerErrors}
              handlers={handlers}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
            />
          )}
        </Router>
      )}
    </CssVarsProvider>
  );
};

export default App;