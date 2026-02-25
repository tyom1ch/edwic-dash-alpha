import React, { useEffect, useState } from "react";
import {
  Experimental_CssVarsProvider as CssVarsProvider,
  createTheme,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { BrowserRouter as Router } from "react-router-dom";
import { SafeArea } from "@capacitor-community/safe-area";
import AppLayout from "./components/AppLayout";
import useAppConfig from "./hooks/useAppConfig";
import eventBus from "./core/EventBus";
import CoreServices from "./core/CoreServices";

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
      CoreServices.initialize(appConfig);
      setIsInitialized(true);
    }
  }, [appConfig, isLoading, isInitialized]);


  useEffect(() => {
    const initSafeArea = async () => {
      try {
        const insets = await SafeArea.getSafeAreaInsets();
        document.documentElement.style.setProperty("--safe-area-top", `${insets.insets.top}px`);
        document.documentElement.style.setProperty("--safe-area-bottom", `${insets.insets.bottom}px`);
        document.documentElement.style.setProperty("--safe-area-left", `${insets.insets.left}px`);
        document.documentElement.style.setProperty("--safe-area-right", `${insets.insets.right}px`);

        SafeArea.addListener("safeAreaChanged", (insets) => {
          document.documentElement.style.setProperty("--safe-area-top", `${insets.insets.top}px`);
          document.documentElement.style.setProperty("--safe-area-bottom", `${insets.insets.bottom}px`);
          document.documentElement.style.setProperty("--safe-area-left", `${insets.insets.left}px`);
          document.documentElement.style.setProperty("--safe-area-right", `${insets.insets.right}px`);
        });
      } catch (e) {
        console.warn("SafeArea error:", e);
      }
    };
    initSafeArea();
  }, []);

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
      <GlobalStyles styles={{ 
        ':root': { 
          '--safe-area-top': 'env(safe-area-inset-top, 0px)',
          '--safe-area-bottom': 'env(safe-area-inset-bottom, 0px)',
          '--safe-area-left': 'env(safe-area-inset-left, 0px)',
          '--safe-area-right': 'env(safe-area-inset-right, 0px)',
        },
        '#root': { 
          paddingTop: 'var(--safe-area-top)',
          paddingBottom: 'var(--safe-area-bottom)',
          paddingLeft: 'var(--safe-area-left)',
          paddingRight: 'var(--safe-area-right)',
        } 
      }} />
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