import React, { useState, useEffect } from "react";
import { useI18n } from "../i18n/LanguageProvider";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  MenuItem,
  Typography,
  Box
} from "@mui/material";

const defaultAlertState = {
  id: "",
  name: "Нове правило",
  brokerId: "",
  topic: "",
  condition: ">",
  threshold: "0",
  messageTemplate: "Увага! {topic} = {value}",
  enabled: true,
  intervalMs: 5 * 60 * 1000, // Default 5 minutes
};

function AlertDialog({
 open, onClose, onSave, editingAlert, brokers }) {
  const { t } = useI18n();
  const [formData, setFormData] = useState(defaultAlertState);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingAlert) {
      setFormData({ ...editingAlert });
    } else {
      setFormData({
        ...defaultAlertState,
        name: t("Нове правило"),
        messageTemplate: t("Увага! {topic} = {value}"),
        brokerId: brokers[0]?.id || "",
      });
    }
  }, [editingAlert, brokers, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    setError("");
    if (!formData.name.trim() || !formData.topic.trim()) {
      setError(t("Назва та топік є обов'язковими."));
      return;
    }
    if (!formData.brokerId) {
      setError(t("Будь ласка, оберіть брокера."));
      return;
    }
    onSave({
      ...formData,
      topic: formData.topic.trim()
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>
        {formData.id ? t("Редагувати алерт") : t("Новий алерт")}
      </DialogTitle>
      <DialogContent dividers>
        <FormControlLabel
          control={
            <Switch
              checked={formData.enabled}
              onChange={handleChange}
              name="enabled"
              color="primary"
            />
          }
          label={t("Увімкнено (Слухати у фоні)")}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label={t("Назва правила")}
          name="name"
          value={formData.name}
          onChange={handleChange}
          sx={{ mb: 2 }}
          required
        />

        <TextField
          select
          fullWidth
          label={t("Брокер")}
          name="brokerId"
          value={formData.brokerId}
          onChange={handleChange}
          sx={{ mb: 2 }}
          required
        >
          {brokers.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.name || b.host}
            </MenuItem>
          ))}
          {brokers.length === 0 && (
            <MenuItem value="" disabled>
              {t("Немає брокерів")}
            </MenuItem>
          )}
        </TextField>

        <TextField
          fullWidth
          label={t("Топік (напр. sensor/temp)")}
          name="topic"
          value={formData.topic}
          onChange={handleChange}
          sx={{ mb: 2 }}
          required
        />

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            select
            fullWidth
            label={t("Умова")}
            name="condition"
            value={formData.condition}
            onChange={handleChange}
          >
            <MenuItem value=">">{t("Більше (>)")}</MenuItem>
            <MenuItem value="<">{t("Менше (<)")}</MenuItem>
            <MenuItem value="==">{t("Дорівнює (==)")}</MenuItem>
            <MenuItem value="!=">{t("Не дорівнює (!=)")}</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label={t("Поріг (Threshold)")}
            name="threshold"
            value={formData.threshold}
            onChange={handleChange}
            type="text" // string support for == true/false
          />
        </Box>

        <TextField
          select
          fullWidth
          label={t("Інтервал повторення")}
          name="intervalMs"
          value={formData.intervalMs || (5 * 60 * 1000)}
          onChange={handleChange}
          sx={{ mb: 2 }}
        >
          <MenuItem value={15 * 1000}>{t("15 секунд")}</MenuItem>
          <MenuItem value={30 * 1000}>{t("30 секунд")}</MenuItem>
          <MenuItem value={60 * 1000}>{t("1 хвилина")}</MenuItem>
          <MenuItem value={5 * 60 * 1000}>{t("5 хвилин")}</MenuItem>
          <MenuItem value={10 * 60 * 1000}>{t("10 хвилин")}</MenuItem>
          <MenuItem value={30 * 60 * 1000}>{t("30 хвилин")}</MenuItem>
          <MenuItem value={60 * 60 * 1000}>{t("1 година")}</MenuItem>
          <MenuItem value={24 * 60 * 60 * 1000}>{t("1 день")}</MenuItem>
        </TextField>

        <TextField
          fullWidth
          label={t("Шаблон повідомлення")}
          name="messageTemplate"
          value={formData.messageTemplate}
          onChange={handleChange}
          sx={{ mb: 1 }}
          helperText={t("Використовуйте {value} та {topic} для підстановки.")}
          multiline
          rows={2}
        />

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Скасувати")}</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {t("Зберегти")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AlertDialog;
