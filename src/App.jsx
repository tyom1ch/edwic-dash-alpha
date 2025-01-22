import React, { useEffect, useState, useMemo } from "react";
import { createTheme, ThemeProvider, CssBaseline, StyledEngineProvider } from "@mui/material";
import MQTTCore from "./core/MQTTCore";
import useLocalStorage from "./hooks/useLocalStorage";
import Dashboard from "./Dashboard/MainDashboard";
import ModalSettings from "./modal/ModalSettings";
import LoadingSpinner from "./components/LoadingSpinner";
import SettingsButton from "./components/SettingsButton";
import useSimpleRouter from "./hooks/useSimpleRouter";

const App = () => {
  const [themeMode, setThemeMode] = useLocalStorage("themeMode", "light"); // Зберігаємо вибір теми
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
        },
      }),
    [themeMode]
  );

  const [connectionSettings, setConnectionSettings] = useLocalStorage(
    "mqttConnectionSettings",
    {
      host: "",
      username: "",
      password: "",
    }
  );

  const [connectionStatus, setConnectionStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    if (loading) {
      MQTTCore.connect(
        "ws://" + connectionSettings.host,
        connectionSettings.username,
        connectionSettings.password
      )
        .then(() => {
          setConnectionStatus(true);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Помилка підключення:", error);
          setConnectionStatus(false);
          setLoading(false);
        });
    }
  }, [loading, connectionSettings]);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleSaveSettings = () => {
    setLoading(true);
    setOpenModal(false);
  };

  const router = useSimpleRouter("/home");

  return (
    <StyledEngineProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {loading && <LoadingSpinner />}
        <SettingsButton onClick={handleOpenModal} />
        <ModalSettings
          open={openModal}
          onClose={handleCloseModal}
          connectionSettings={connectionSettings}
          setConnectionSettings={setConnectionSettings}
          onSave={handleSaveSettings}
        />
        {connectionStatus && <Dashboard router={router} />}
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;
