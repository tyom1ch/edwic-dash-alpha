import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Checkbox,
  FormControlLabel
} from "@mui/material";
import { useNavigate } from 'react-router-dom';

// Очікувані пропси з App.jsx:
// brokers: Array (наприклад, appConfig.brokers)
// setBrokers: Function (функція для оновлення appConfig.brokers у localStorage)
function SettingsPage({ brokers, setBrokers }) {
  const navigate = useNavigate();

  // Локальний стан для форми брокера
  // Ми працюємо з першим брокером у масиві 'brokers' або створюємо заглушку
  const initialBrokerState = brokers && brokers.length > 0 ? { ...brokers[0] } : {
    id: '', // Буде згенеровано при першому збереженні
    name: 'Основний брокер', // Дефолтна назва
    host: "",
    port: "",
    username: "",
    password: "",
    main_topic: "", // Це поле більше не використовується ядром для підключення, лише для зручності UI
    secure: false, // Для wss://
    basepath: "", // Для шляху в URL, напр. /ws
  };
  const [currentBrokerConfig, setCurrentBrokerConfig] = useState(initialBrokerState);

  const [tabIndex, setTabIndex] = useState(0); // 0: Резервне копіювання, 1: Конфігурація Брокера
  const [loading, setLoading] = useState(false); // Для індикації збереження
  const [error, setError] = useState(""); // Для відображення помилок збереження

  // useEffect для синхронізації локального стану форми з пропсом 'brokers'
  // Це потрібно, щоб форма оновлювалася, якщо 'brokers' змінився ззовні (наприклад, після перезавантаження App)
  useEffect(() => {
    if (brokers && brokers.length > 0) {
      setCurrentBrokerConfig({ ...brokers[0] });
    } else {
      // Якщо брокерів немає, скинути форму або показати дефолтний порожній стан
      setCurrentBrokerConfig({
        id: '', name: 'Основний брокер', host: '', port: '', username: '', password: '', main_topic: '', secure: false, basepath: '',
      });
    }
  }, [brokers]); // Залежить від зміни пропса 'brokers'


  const handleBrokerConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentBrokerConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveBroker = async () => {
    setError("");
    setLoading(true);

    try {
      if (!currentBrokerConfig.host || !currentBrokerConfig.port) {
        throw new Error("Host та Port брокера є обов'язковими.");
      }

      let updatedBrokers = [];
      const newBrokerId = currentBrokerConfig.id || `broker-${Date.now()}`; // Генеруємо ID, якщо його немає

      const brokerToSave = {
        ...currentBrokerConfig,
        id: newBrokerId,
        port: parseInt(currentBrokerConfig.port), // Перетворюємо порт в число
        basepath: currentBrokerConfig.basepath, // Зберігаємо basepath
      };

      if (brokers && brokers.length > 0 && brokers[0].id) {
        // Якщо брокер вже існує (оновлюємо перший брокер у масиві)
        updatedBrokers = brokers.map((b, index) => index === 0 ? brokerToSave : b);
      } else {
        // Якщо брокерів немає, додаємо новий брокер як перший елемент масиву
        updatedBrokers = [brokerToSave];
      }

      setBrokers(updatedBrokers); // Викликаємо функцію з App.jsx, щоб оновити appConfig.brokers в localStorage

      // navigate("/dashboard"); 
      // // Перекидаємо на дашборд
    } catch (err) {
      setError(err.message);
      console.error("Помилка збереження налаштувань брокера:", err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Box sx={{ maxWidth: 600, margin: "auto", padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Налаштування EdWic
      </Typography>

      <Tabs value={tabIndex} onChange={(e, newIndex) => setTabIndex(newIndex)} sx={{ mb: 2 }}>
        <Tab label="Резервне копіювання" />
        <Tab label="Конфігурація Брокера" />
        {/* Вкладка для InfluxDB конфігурації видалена, так як її не потрібно вводити користувачу */}
      </Tabs>

      {tabIndex === 0 && ( // Вкладка: Резервне копіювання
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>Резервне копіювання та відновлення</Typography>
          <Button variant="contained" fullWidth sx={{ mb: 1 }}>
            Експорт Налаштувань (JSON)
          </Button>
          <Button variant="contained" fullWidth sx={{ mb: 1 }}>
            Імпорт Налаштувань (JSON)
          </Button>
          <Button variant="contained" color="error" fullWidth>
            Скинути Всі Налаштування
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
            Це скине всі брокери, дашборди та правила алертів!
          </Typography>
        </Box>
      )}

      {tabIndex === 1 && ( // Вкладка: Конфігурація Брокера
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>Конфігурація Основного MQTT Брокера</Typography>
          <TextField
            fullWidth
            label="IP брокера / Hostname"
            name="host"
            value={currentBrokerConfig.host}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="Порт брокера (WebSockets, напр. 8083)"
            name="port"
            value={currentBrokerConfig.port}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
            type="number"
            required
          />
          <TextField
            fullWidth
            label="Логін"
            name="username"
            value={currentBrokerConfig.username}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Пароль"
            type="password"
            name="password"
            value={currentBrokerConfig.password}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
          />
          {/* Нове поле для Basepath */}
          <TextField
            fullWidth
            label="Базовий шлях (Basepath, напр. /ws)"
            name="basepath"
            value={currentBrokerConfig.basepath}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
            helperText="Якщо брокер вимагає шлях у URL для WebSockets (напр. /ws, /mqtt)"
          />
          <TextField
            fullWidth
            label="Основний топік (не використовується ядром)"
            name="main_topic"
            value={currentBrokerConfig.main_topic}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
            helperText="Це поле більше не використовується ядром для підключення. Воно залишається для вашої зручності."
          />
          <FormControlLabel
              control={<Checkbox checked={currentBrokerConfig.secure} onChange={handleBrokerConfigChange} name="secure" />}
              label="Використовувати Secure WebSockets (WSS)"
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
            onClick={handleSaveBroker}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              "Зберегти Налаштування Брокера"
            )}
          </Button>
        </Box>
      )}

      {/* Кнопка "Повернутися на Дашборд" тепер окремо, не залежить від вкладки */}
      <Button
        variant="outlined"
        fullWidth
        sx={{ mt: 4 }}
        onClick={() => navigate("/dashboard")}
      >
        Повернутися на Дашборд
      </Button>
    </Box>
  );
}

export default SettingsPage;