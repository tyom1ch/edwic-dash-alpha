import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
} from "@mui/material";
import useLocalStorage from "../hooks/useLocalStorage";
import MQTTCore from "../core/MQTTCore";

function SettingsPage({router, setConnectionSettings}) {
  const [brokerConfig, setBrokerConfig] = useLocalStorage(
    "mqttConnectionSettings",
    {
      host: "",
      port: "",
      username: "",
      password: "",
      main_topic: "",
    }
  );

  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBrokerConfigChange = (e) => {
    setBrokerConfig({ ...brokerConfig, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");

    try {
      await MQTTCore.disconnect();
      await MQTTCore.connect(
        `ws://${brokerConfig.host}:${brokerConfig.port}`,
        brokerConfig.username,
        brokerConfig.password
      );
      console.log("INFO: ", MQTTCore.isConnected())
      router.navigate("/dashboard"); // Після успішного підключення переходимо в дашборд
    } catch (error) {
      console.error(error);
      setError(
        error.message ||
          "Не вдалося підключитися до MQTT брокера. Перевірте налаштування."
      );
    }

    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 600, margin: "auto", padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Налаштування
      </Typography>

      <Tabs value={tabIndex} onChange={(e, newIndex) => setTabIndex(newIndex)}>
        <Tab label="Резервне копіювання" />
        <Tab label="Конфігурація брокеру" />
      </Tabs>

      {tabIndex === 0 && (
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" fullWidth sx={{ mb: 1 }}>
            Імпорт файлу
          </Button>
          <Button variant="contained" fullWidth sx={{ mb: 1 }}>
            Експорт файлу
          </Button>
          <Button variant="contained" color="error" fullWidth>
            Скидання налаштувань
          </Button>
        </Box>
      )}

      {tabIndex === 1 && (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="IP брокера"
            name="host"
            value={brokerConfig.host}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Порт брокера"
            name="port"
            value={brokerConfig.port}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Логін"
            name="username"
            value={brokerConfig.username}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Пароль"
            type="password"
            name="password"
            value={brokerConfig.password}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Основний топік"
            name="main_topic"
            value={brokerConfig.main_topic}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
          />

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              "Зберегти та підключитися"
            )}
          </Button>

          <Button
            variant="outlined"
            fullWidth
            sx={{ mt: 2 }}
            onClick={() => router.navigate("/dashboard")}
          >
            Вийти без збереження
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default SettingsPage;
