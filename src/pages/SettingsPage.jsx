import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import useAppConfig from "../hooks/useAppConfig";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function SettingsPage({ brokers, setBrokers }) {
  const navigate = useNavigate();
  const { appConfig, setAppConfig } = useAppConfig();
  const fileInputRef = useRef(null);

  const initialBrokerState = brokers?.length
    ? { ...brokers[0] }
    : {
        id: "",
        name: "Основний брокер",
        host: "",
        port: "",
        username: "",
        password: "",
        discovery_topic: "homeassistant",
        secure: false,
        basepath: "",
      };

  const [currentBrokerConfig, setCurrentBrokerConfig] = useState(initialBrokerState);
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (brokers?.length) {
      setCurrentBrokerConfig({ ...brokers[0] });
    } else {
      setCurrentBrokerConfig(initialBrokerState);
    }
  }, [brokers]);

  const handleBrokerConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentBrokerConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveBroker = async () => {
    setError("");
    setLoading(true);
    try {
      if (!currentBrokerConfig.host || !currentBrokerConfig.port) {
        throw new Error("Host та Port брокера є обов'язковими.");
      }
      const newBrokerId = currentBrokerConfig.id || `broker-${Date.now()}`;
      const brokerToSave = {
        ...currentBrokerConfig,
        id: newBrokerId,
        port: parseInt(currentBrokerConfig.port, 10),
        basepath: currentBrokerConfig.basepath || "",
        discovery_topic:
          currentBrokerConfig.discovery_topic?.trim() || "homeassistant",
      };
      const updatedBrokers = brokers?.length
        ? brokers.map((b, index) => (index === 0 ? brokerToSave : b))
        : [brokerToSave];
      setBrokers(updatedBrokers);
      alert("Налаштування брокера збережено. З'єднання буде оновлено автоматично.");
    } catch (err) {
      setError(err.message);
      console.error("Помилка збереження налаштувань брокера:", err);
    } finally {
      setLoading(false);
    }
  };

  // Єдиний метод для експорту — через Share
  const handleShareFile = async () => {
    setError("");
    setLoading(true);
    try {
      const fileName = `edwic-backup-${new Date().toISOString().split("T")[0]}.json`;
      const json = JSON.stringify(appConfig, null, 2);
      // Записуємо в кеш (всередині додатку)
      const result = await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      // Викликаємо нативний діалог Share/Save as...
      await Share.share({
        title: "Резервна копія EdwIC",
        text: "💾 (ВАЖЛИВО) - РЕЗЕРВНА КОПІЯ EDwIC",
        url: result.uri,
        dialogTitle: "Зберегти або Поділитися резервною копією",
      });
    } catch (err) {
      if (err.message !== "Share canceled") {
        setError(`Помилка: ${err.message}`);
        console.error("Помилка при виклику Share:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => fileInputRef.current.click();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target.result);
        if (importedConfig?.brokers && importedConfig?.dashboards) {
          if (
            window.confirm(
              "Ви впевнені, що хочете імпортувати нові налаштування? Поточні налаштування будуть перезаписані."
            )
          ) {
            setAppConfig(importedConfig);
            alert("Налаштування успішно імпортовано! Додаток буде перезавантажено.");
            window.location.reload();
          }
        } else {
          throw new Error("Некоректний формат файлу конфігурації.");
        }
      } catch (err) {
        setError(`Помилка імпорту: ${err.message}`);
        console.error("Import error:", err);
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleReset = () => {
    if (
      window.confirm(
        "ВИ ВПЕВНЕНІ? Ця дія видалить всі ваші дашборди та налаштування брокера. Відмінити це буде неможливо."
      )
    ) {
      localStorage.removeItem("appConfig");
      alert("Всі налаштування скинуто. Додаток буде перезавантажено.");
      window.location.reload();
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
      </Tabs>

      {tabIndex === 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Резервне копіювання та відновлення
          </Typography>
          <Button variant="contained" fullWidth onClick={handleShareFile} disabled={loading} sx={{ mb: 2 }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : "Поділитись / Зберегти як..."}
          </Button>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} accept=".json" />
          <Button variant="contained" fullWidth sx={{ mb: 1 }} onClick={handleImportClick}>
            Імпорт Налаштувань (JSON)
          </Button>
          <Button variant="contained" color="error" fullWidth onClick={handleReset}>
            Скинути Всі Налаштування
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1, color: "text.secondary" }}>
            Це скине всі брокери, дашборди та віджети!
          </Typography>
          {error && (
            <Typography color="error" sx={{ mt: 2, wordBreak: "break-word" }}>
              {error}
            </Typography>
          )}
        </Box>
      )}

      {tabIndex === 1 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Конфігурація Основного MQTT Брокера
          </Typography>
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
            label="Топік для Discovery"
            name="discovery_topic"
            value={currentBrokerConfig.discovery_topic}
            onChange={handleBrokerConfigChange}
            sx={{ mb: 2 }}
            helperText="Наприклад, 'homeassistant' (без #). Якщо залишити порожнім, буде використано 'homeassistant'."
          />
          <FormControlLabel
            control={
              <Checkbox checked={!!currentBrokerConfig.secure} onChange={handleBrokerConfigChange} name="secure" />
            }
            label="Використовувати Secure WebSockets (WSS)"
            sx={{ mb: 2 }}
          />
          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <Button variant="contained" fullWidth onClick={handleSaveBroker} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Зберегти Налаштування Брокера"}
          </Button>
        </Box>
      )}

      <Button variant="outlined" fullWidth sx={{ mt: 4 }} onClick={() => navigate(`/${Object.keys(appConfig.dashboards)[0] || ""}`)}>
        Повернутися на Дашборд
      </Button>
    </Box>
  );
}

export default SettingsPage;
