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
import { Capacitor } from '@capacitor/core';

const App = () => {
  const [themeMode, setThemeMode] = useState(
    localStorage.getItem("toolpad-mode") || "system"
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const { appConfig, isLoading, setAppConfig, globalConnectionStatus, ...handlers } =
    useAppConfig();

  useEffect(() => {
    localStorage.setItem("toolpad-mode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!isLoading && !isInitialized) {
      if (Capacitor.isNativePlatform()) {
        EdgeToEdge.enable().catch(console.error);
      }
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
        <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
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