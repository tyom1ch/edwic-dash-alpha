import React, { useState, useRef } from "react";
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
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Card,
  CardContent,
  useColorScheme,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  Alert,
  AlertTitle,
} from "@mui/material";
import {
  LightMode,
  DarkMode,
  SettingsSystemDaydream,
  GitHub,
  Delete,
  Edit,
  Add,
  CloudDone,
  Notifications,
  BatteryChargingFull,
  SettingsInputComponent,
  PowerSettingsNew,
} from "@mui/icons-material";
import { registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useNavigate } from "react-router-dom";
import useAppConfig from "../hooks/useAppConfig";
import AlertDialog from "../components/AlertDialog";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { db } from "../core/db";

const defaultBrokerState = {
  id: "",
  name: "Мій брокер",
  host: "",
  port: "",
  username: "",
  password: "",
  discovery_topic: "homeassistant",
  secure: false,
  basepath: "",
};

const isNativePlatform = Capacitor.isNativePlatform();
const NativeMqtt = isNativePlatform ? registerPlugin('NativeMqtt') : null;

function SettingsPage({ brokers, setBrokers, themeMode, setThemeMode }) {
  const navigate = useNavigate();
  const { appConfig, setAppConfig, brokerStatuses, brokerErrors, handlers } = useAppConfig();
  const { setMode } = useColorScheme();
  const fileInputRef = useRef(null);

  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem("edwic_debug") === "true");

  const [isBrokerDialogOpen, setIsBrokerDialogOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState(defaultBrokerState);

  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const alerts = appConfig.alerts || [];
  const { handleSetAlerts } = handlers || {};

  // --- System Status State ---
  const [sysStatus, setSysStatus] = useState({
    serviceRunning: false,
    notifications: 'prompt',
    batteryIgnoring: false,
    loading: true
  });

  const checkSystemStatus = async () => {
    if (!isNativePlatform) return;
    try {
      const statusRes = await NativeMqtt.getStatus();
      const permRes = await LocalNotifications.checkPermissions();
      const batteryRes = await NativeMqtt.checkBatteryOptimization();

      setSysStatus({
        serviceRunning: !!statusRes.running,
        notifications: permRes.display,
        batteryIgnoring: !!batteryRes.isIgnoring,
        loading: false
      });
    } catch (e) {
      console.warn("Failed to check system status:", e);
      setSysStatus(prev => ({ ...prev, loading: false }));
    }
  };

  React.useEffect(() => {
    if (tabIndex === 2 && isNativePlatform) {
      checkSystemStatus();
    }
  }, [tabIndex]);

  const handleRequestNotifications = async () => {
    try {
      const res = await LocalNotifications.requestPermissions();
      setSysStatus(prev => ({ ...prev, notifications: res.display }));
    } catch (e) {
      setError("Не вдалося запросити дозвіл на сповіщення");
    }
  };

  const handleRequestBattery = async () => {
    try {
      await NativeMqtt.requestIgnoreBatteryOptimizations();
      // We can't immediately know if they granted it since it opens an activity,
      // but we'll re-check after a short delay or when they come back.
      setTimeout(checkSystemStatus, 2000);
    } catch (e) {
      setError("Не вдалося відкрити налаштування батареї");
    }
  };

  const handleToggleService = async () => {
    try {
      if (sysStatus.serviceRunning) {
        await NativeMqtt.stopService();
      } else {
        await NativeMqtt.startService({ 
          brokers: brokers || [],
          alerts: appConfig.alerts || []
        });
      }
      setTimeout(checkSystemStatus, 500);
    } catch (e) {
      setError("Помилка керування сервісом: " + e.message);
    }
  };

  // --- Confirm/Alert Dialog State ---
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    isAlert: false,
    onConfirm: null,
  });

  const requestConfirm = (title, message, onAction) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      isAlert: false,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        onAction();
      }
    });
  };

  const requestAlert = (title, message, onAction) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      isAlert: true,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        if (onAction) onAction();
      }
    });
  };

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

  // --- Broker CRUD Handlers ---

  const handleOpenBrokerDialog = (broker = null) => {
    setEditingBroker(broker ? { ...broker } : { ...defaultBrokerState });
    setError("");
    setIsBrokerDialogOpen(true);
  };

  const handleCloseBrokerDialog = () => {
    setIsBrokerDialogOpen(false);
  };

  const handleBrokerFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingBroker((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveBroker = () => {
    setError("");
    try {
      if (!editingBroker.host || !editingBroker.port) {
        throw new Error("Хост та порт є обов'язковими.");
      }

      const brokerToSave = {
        ...editingBroker,
        port: parseInt(editingBroker.port, 10),
        basepath: editingBroker.basepath || "",
        discovery_topic: editingBroker.discovery_topic?.trim() || "homeassistant",
      };

      let updatedBrokers;
      if (brokerToSave.id) {
        // Edit existing
        updatedBrokers = brokers.map((b) =>
          b.id === brokerToSave.id ? brokerToSave : b
        );
      } else {
        // Add new
        brokerToSave.id = `broker-${Date.now()}`;
        updatedBrokers = [...(brokers || []), brokerToSave];
      }

      setBrokers(updatedBrokers);
      setIsBrokerDialogOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteBroker = (id) => {
    requestConfirm(
      "Видалити брокера?",
      "Дійсно видалити цього брокера зі списку?",
      () => {
        setBrokers((brokers || []).filter((b) => b.id !== id));
      }
    );
  };

  // --- Alerts CRUD Handlers ---

  const handleOpenAlertDialog = (alert = null) => {
    setEditingAlert(alert);
    setIsAlertDialogOpen(true);
  };

  const handleSaveAlert = (alertToSave) => {
    let updatedAlerts;
    if (alertToSave.id) {
      updatedAlerts = alerts.map((a) => (a.id === alertToSave.id ? alertToSave : a));
    } else {
      alertToSave.id = `alert-${Date.now()}`;
      updatedAlerts = [...alerts, alertToSave];
    }
    if (handleSetAlerts) handleSetAlerts(updatedAlerts);
    setIsAlertDialogOpen(false);
  };

  const handleDeleteAlert = (id) => {
    requestConfirm(
      "Видалити алерт?",
      "Дійсно видалити цей алерт?",
      () => {
        if (handleSetAlerts) handleSetAlerts(alerts.filter((a) => a.id !== id));
      }
    );
  };

  // --- Export / Import Handlers ---

  const handleExportConfig = async () => {
    setError("");
    setLoading(true);
    try {
      const fileName = `edwic-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      const json = JSON.stringify(appConfig, null, 2);

      if (Capacitor.isNativePlatform()) {
        try {
          // 1. Write to Cache first (allowed without permissions)
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: json,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
          
          // 2. Open Native Share Dialog so user can save it to Drive/Downloads
          await Share.share({
            title: 'Експорт конфігурації Edwic',
            text: 'Резервна копія налаштувань Edwic Dashboard',
            url: writeResult.uri,
            dialogTitle: 'Зберегти конфігурацію'
          });
          
        } catch (fileErr) {
          throw new Error(`Помилка під час експорту: ${fileErr.message}`);
        }
      } else {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(`Помилка експорту: ${err.message}`);
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
        if (importedConfig?.dashboards) {
          requestConfirm(
            "Імпорт налаштувань",
            "Ви впевнені, що хочете імпортувати нові налаштування? Усі поточні дашборди та підключення будуть перезаписані.",
            () => {
               setAppConfig(importedConfig);
               requestAlert("Успіх", "Налаштування успішно імпортовано!", () => {
                 window.location.reload();
               });
            }
          );
        } else {
          throw new Error("Некоректний формат файлу.");
        }
      } catch (err) {
        setError(`Помилка імпорту: ${err.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleReset = () => {
    requestConfirm(
      "Увага! Скидання налаштувань",
      "ВИ ВПЕВНЕНІ? Ця дія повністю видалить всі ваші дашборди, алерт правила та брокери. Відмінити це неможливо!",
      async () => {
        try {
          // Clear legacy localStorage
          localStorage.removeItem("appConfig");
          // Clear IndexedDB completely
          await db.delete();
          
          requestAlert("Успіх", "Налаштування скинуто.", () => {
            window.location.reload();
          });
        } catch (e) {
          setError(`Помилка скидання: ${e.message}`);
        }
      }
    );
  };

  const handleThemeChange = (e, newMode) => {
    if (!newMode) return;
    setThemeMode(newMode);
    setMode(newMode);
  };

  return (
    <Box sx={{ maxWidth: "100%", mx: "auto", p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Налаштування EdWic
      </Typography>

      <Tabs
        value={tabIndex}
        onChange={(e, newIndex) => setTabIndex(newIndex)}
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab label="Брокери" />
        <Tab label="Алерти" />
        <Tab label="Система" />
        <Tab label="Додатково" />
      </Tabs>

      {/* ВКЛАДКА 1: Брокери */}
      {tabIndex === 0 && (
        <Box sx={{ mt: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">MQTT Брокери</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenBrokerDialog()}
              size="small"
            >
              Додати
            </Button>
          </Stack>

          {(!brokers || brokers.length === 0) ? (
            <Card variant="outlined" sx={{ mb: 2, textAlign: "center", py: 3 }}>
              <Typography color="text.secondary">
                Немає налаштованих брокерів.
              </Typography>
            </Card>
          ) : (
            <List sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {brokers.map((broker) => {
                const status = brokerStatuses[broker.id] || "offline";
                const errorMsg = brokerErrors[broker.id];

                let statusDotColor = "#f44336"; // offline or error
                if (status === "connected") statusDotColor = "#4caf50";
                else if (status === "connecting" || status === "reconnecting") statusDotColor = "#2196f3";

                return (
                <Card variant="outlined" key={broker.id}>
                  <ListItem
                    disablePadding
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Редагувати">
                          <IconButton onClick={() => handleOpenBrokerDialog(broker)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Видалити">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteBroker(broker.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    }
                  >
                    <Box sx={{ px: 2, py: 1.5, width: '100%' }}>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: statusDotColor }} />
                            <Typography fontWeight="bold">{broker.name || broker.host}</Typography>
                          </Stack>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {isNativePlatform 
                                ? `${broker.secure ? "ssl" : "tcp"}://${broker.host}:${broker.port}` 
                                : `${broker.secure ? "wss://" : "ws://"}${broker.host}:${broker.port}${broker.basepath || ""}`
                              }
                            </Typography>
                            {(status === "error" || status === "offline") && errorMsg && (
                              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                Помилка: {errorMsg}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </Box>
                  </ListItem>
                </Card>
                );
              })}
            </List>
          )}

          {/* Діалог Додавання/Редагування */}
          <Dialog open={isBrokerDialogOpen} onClose={handleCloseBrokerDialog} fullWidth>
            <DialogTitle>
              {editingBroker.id ? "Редагувати брокера" : "Новий брокер"}
            </DialogTitle>
            <DialogContent dividers>
              <TextField
                fullWidth
                label="Назва (напр. 'Домашній')"
                name="name"
                value={editingBroker.name}
                onChange={handleBrokerFieldChange}
                sx={{ mb: 2, mt: 1 }}
              />
              <TextField
                fullWidth
                label="IP брокера / Hostname *"
                name="host"
                value={editingBroker.host}
                onChange={handleBrokerFieldChange}
                sx={{ mb: 2 }}
                required
              />
              <TextField
                fullWidth
                label={isNativePlatform ? "Порт MQTT (TCP: 1883/1884) *" : "Порт брокера (WebSockets: 8080) *"}
                name="port"
                value={editingBroker.port}
                onChange={handleBrokerFieldChange}
                sx={{ mb: 2 }}
                type="number"
                required
                helperText={isNativePlatform ? "Мобільний додаток використовує MQTT TCP протокол, не WebSocket" : ""}
              />
              <TextField
                fullWidth
                label="Логін"
                name="username"
                value={editingBroker.username}
                onChange={handleBrokerFieldChange}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Пароль"
                type="password"
                name="password"
                value={editingBroker.password}
                onChange={handleBrokerFieldChange}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Базовий шлях (/ws)"
                name="basepath"
                value={editingBroker.basepath}
                onChange={handleBrokerFieldChange}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Топік Home Assistant Discovery"
                name="discovery_topic"
                value={editingBroker.discovery_topic}
                onChange={handleBrokerFieldChange}
                sx={{ mb: 2 }}
                helperText="Стандартно: 'homeassistant'"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!editingBroker.secure}
                    onChange={handleBrokerFieldChange}
                    name="secure"
                  />
                }
                label={isNativePlatform ? "Використовувати SSL/TLS шифрування" : "Використовувати Secure WebSockets (WSS)"}
              />
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseBrokerDialog}>Скасувати</Button>
              <Button onClick={handleSaveBroker} variant="contained">
                Зберегти
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ВКЛАДКА 2: Алерти (Фонові сповіщення) */}
      {tabIndex === 1 && (
        <Box sx={{ mt: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Фонові Алерти</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenAlertDialog()}
              size="small"
            >
              Додати
            </Button>
          </Stack>

          {alerts.length === 0 ? (
            <Card variant="outlined" sx={{ mb: 2, textAlign: "center", py: 3 }}>
              <Typography color="text.secondary">
                Немає налаштованих фонових повідомлень.
              </Typography>
            </Card>
          ) : (
            <List sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {alerts.map((al) => (
                <Card variant="outlined" key={al.id}>
                  <ListItem
                    disablePadding
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Редагувати">
                          <IconButton onClick={() => handleOpenAlertDialog(al)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Видалити">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteAlert(al.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    }
                  >
                    <Box sx={{ px: 2, py: 1.5, width: '100%' }}>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: al.enabled ? "#4caf50" : "#9e9e9e" }} />
                            <Typography fontWeight="bold">{al.name}</Typography>
                          </Stack>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {al.topic} {al.condition} {al.threshold}
                          </Typography>
                        }
                      />
                    </Box>
                  </ListItem>
                </Card>
              ))}
            </List>
          )}

          <AlertDialog
            open={isAlertDialogOpen}
            onClose={() => setIsAlertDialogOpen(false)}
            onSave={handleSaveAlert}
            editingAlert={editingAlert}
            brokers={brokers || []}
          />
        </Box>
      )}

      {/* ВКЛАДКА 3: Системні налаштування (Візуальні) */}
      {tabIndex === 2 && (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
          {isNativePlatform && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                  <SettingsInputComponent sx={{ mr: 1 }} /> Стан системи (Android)
                </Typography>
                
                <List>
                  <ListItem
                    secondaryAction={
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color={sysStatus.serviceRunning ? "error" : "primary"}
                        onClick={handleToggleService}
                        startIcon={<PowerSettingsNew />}
                      >
                        {sysStatus.serviceRunning ? "Зупинити" : "Запустити"}
                      </Button>
                    }
                  >
                    <ListItemText 
                      primary="Фоновий MQTT Сервіс" 
                      secondary={sysStatus.serviceRunning ? "Працює у фоні" : "Зупинено"} 
                    />
                  </ListItem>
                  
                  <Divider component="li" />

                  <ListItem
                    secondaryAction={
                      sysStatus.notifications !== 'granted' && (
                        <Button size="small" onClick={handleRequestNotifications}>
                          Надати
                        </Button>
                      )
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Notifications color={sysStatus.notifications === 'granted' ? "success" : "warning"} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Сповіщення" 
                      secondary={sysStatus.notifications === 'granted' ? "Дозволено" : "Вимкнено"} 
                    />
                  </ListItem>

                  <Divider component="li" />

                  <ListItem
                    secondaryAction={
                      !sysStatus.batteryIgnoring && (
                        <Button size="small" onClick={handleRequestBattery}>
                          Налаштувати
                        </Button>
                      )
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <BatteryChargingFull color={sysStatus.batteryIgnoring ? "success" : "warning"} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Оптимізація батареї" 
                      secondary={sysStatus.batteryIgnoring ? "Вимкнено (надійно)" : "Увімкнено (можливі затримки)"} 
                    />
                  </ListItem>
                </List>

                {!sysStatus.batteryIgnoring && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <AlertTitle>Порада</AlertTitle>
                    Для стабільної роботи у фоні рекомендується вимкнути оптимізацію батареї для цього додатка.
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          <Box>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <PowerSettingsNew sx={{ mr: 1 }} /> Налаштування запуску
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!appConfig.autoConnect}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAppConfig(prev => ({ ...prev, autoConnect: val }));
                  }}
                  name="autoConnect"
                />
              }
              label="Автоматично підключатися при старті"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -0.5 }}>
              Якщо вимкнено, додаток не буде ініціалізувати MQTT з'єднання доки ви не перейдете на дашборд або не натиснете "Запустити".
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Тема додатку
            </Typography>
            <ToggleButtonGroup
              color="primary"
              value={themeMode}
              exclusive
              onChange={handleThemeChange}
              fullWidth
            >
              <ToggleButton value="light">
                <LightMode sx={{ mr: 1 }} />
                Світла
              </ToggleButton>
              <ToggleButton value="dark">
                <DarkMode sx={{ mr: 1 }} />
                Темна
              </ToggleButton>
              <ToggleButton value="system">
                <SettingsSystemDaydream sx={{ mr: 1 }} />
                Системна
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      )}

      {/* ВКЛАДКА 4: Додатково (Резервні копії) */}
      {tabIndex === 3 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Резервне копіювання
          </Typography>
          <Button
            variant="contained"
            fullWidth
            onClick={handleExportConfig}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Експорт (JSON)"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept=".json"
          />
          <Button
            variant="outlined"
            fullWidth
            sx={{ mb: 4 }}
            onClick={handleImportClick}
          >
            Відновити з файлу
          </Button>

          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Небезпечна зона
          </Typography>
          <Button
            variant="contained"
            color="error"
            fullWidth
            onClick={handleReset}
          >
            Скинути Дашборди та Брокери
          </Button>

          <Box mt={4}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Налаштування розробника
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={debugMode}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setDebugMode(val);
                    localStorage.setItem("edwic_debug", val.toString());
                    if (val) {
                      window.location.reload(); // Reload to inject interceptors EARLY
                    }
                  }}
                  name="debugMode"
                />
              }
              label="Увімкнути режим налагодження (Спливаючі помилки)"
            />
          </Box>

          <Box mt={4}>
            <Button
              variant="text"
              startIcon={<GitHub />}
              href="https://github.com/tyom1ch/edwic-dash-alpha/issues"
              target="_blank"
              fullWidth
            >
              Код та Зворотній зв'язок (GitHub)
            </Button>
          </Box>
        </Box>
      )}

      {Object.keys(appConfig.dashboards).length > 0 && (
        <Button
          variant="text"
          fullWidth
          sx={{ mt: 4 }}
          onClick={() => navigate(`/${Object.keys(appConfig.dashboards)[0]}`)}
        >
          Повернутися на Дашборд
        </Button>
      )}

      {/* Глобальний діалог підтвердження */}
      <Dialog open={confirmDialog.open} onClose={closeConfirm} maxWidth="xs" fullWidth>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent dividers>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          {!confirmDialog.isAlert && (
            <Button onClick={closeConfirm} color="inherit">Скасувати</Button>
          )}
          <Button 
            onClick={confirmDialog.onConfirm} 
            variant="contained" 
            color={confirmDialog.isAlert ? "primary" : "error"}
          >
            {confirmDialog.isAlert ? "OK" : "Підтвердити"}
          </Button>
        </DialogActions>
      </Dialog>
      
    </Box>
  );
}

export default SettingsPage;
