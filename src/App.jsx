import React, { useEffect, useState, useMemo } from "react";
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  StyledEngineProvider,
} from "@mui/material";
import MQTTCore from "./core/MQTTCore";
import useLocalStorage from "./hooks/useLocalStorage";
import Dashboard from "./Dashboard/MainDashboard";
import SettingsPage from "./Dashboard/SettingsPage"; // Імпортуємо сторінку налаштувань
import LoadingSpinner from "./components/LoadingSpinner";
import SettingsButton from "./components/SettingsButton";
import useSimpleRouter from "./hooks/useSimpleRouter";

const App = () => {
  const [themeMode] = useLocalStorage("themeMode", "light");
  const theme = useMemo(
    () => createTheme({ palette: { mode: themeMode } }),
    [themeMode]
  );

  const [connectionSettings, setConnectionSettings] = useLocalStorage(
    "mqttConnectionSettings",
    { host: "", port: "", username: "", password: "", main_topic: "" }
  );

  const [connectionStatus, setConnectionStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useSimpleRouter("/dashboard");

  useEffect(() => {
    if (!connectionSettings.host || !connectionSettings.port) {
      router.navigate("/settings");
      return;
    }
  
    setLoading(true);
    MQTTCore.disconnect() // Спочатку відключимо попереднє підключення
      .then(() =>
        MQTTCore.connect(
          `ws://${connectionSettings.host}:${connectionSettings.port}`,
          connectionSettings.username,
          connectionSettings.password
        )
      )
      .then(() => {
        setConnectionStatus(true);
      })
      .catch(() => {
        setConnectionStatus(false);
        router.navigate("/settings"); // Якщо помилка — повертаємо на налаштування
      })
      .finally(() => setLoading(false));
  }, [connectionSettings]);
  

  return (
    <StyledEngineProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {<Dashboard router={router} setConnectionSettings={setConnectionSettings} connectionStatus={connectionStatus}/>}
        
        <SettingsButton onClick={() => router.navigate("/settings")} />
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;
