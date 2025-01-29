import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Tabs,
  Tab,
  Typography,
} from "@mui/material";

function SettingsPage() {
  const [brokerConfig, setBrokerConfig] = useState({
    ip: "",
    port: "",
    login: "",
    password: "",
    topic: "",
  });

  const [tabIndex, setTabIndex] = useState(0);

  const handleBrokerConfigChange = (e) => {
    setBrokerConfig({ ...brokerConfig, [e.target.name]: e.target.value });
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
            name="ip"
            value={brokerConfig.ip}
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
            name="login"
            value={brokerConfig.login}
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
            name="topic"
            value={brokerConfig.topic}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
          />
        </Box>
      )}
    </Box>
  );
}

export default SettingsPage;
