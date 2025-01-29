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
  const theme = useMemo(() => createTheme({ palette: { mode: themeMode } }), [themeMode]);

  const [connectionSettings, setConnectionSettings] = useLocalStorage(
    "mqttConnectionSettings",
    { host: "", port: "", username: "", password: "", main_topic: "" }
  );

  const [connectionStatus, setConnectionStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useSimpleRouter("/dashboard");

  useEffect(() => {
    if (!connectionSettings.host || !connectionSettings.port) {
      router.navigate("/settings"); // Якщо брокер не налаштований, відкриваємо сторінку налаштувань
      return;
    }

    if (loading) {
      MQTTCore.connect(
        `ws://${connectionSettings.host}:${connectionSettings.port}`,
        connectionSettings.username,
        connectionSettings.password
      )
        .then(() => {
          setConnectionStatus(true);
          setLoading(false);
        })
        .catch(() => {
          setConnectionStatus(false);
          setLoading(false);
          router.navigate("/settings"); // Якщо помилка підключення – перекидаємо на /settings
        });
    }
  }, [loading, connectionSettings]);

  return (
    <StyledEngineProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {loading && <LoadingSpinner />}
        {router.pathname === "/settings" ? (
          <SettingsPage setConnectionSettings={setConnectionSettings} />
        ) : (
          connectionStatus && <Dashboard router={router} />
        )}
        <SettingsButton onClick={() => router.navigate("/settings")} />
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;
