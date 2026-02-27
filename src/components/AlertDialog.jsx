import React, { useState, useEffect } from "react";
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

function AlertDialog({ open, onClose, onSave, editingAlert, brokers }) {
  const [formData, setFormData] = useState(defaultAlertState);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingAlert) {
      setFormData({ ...editingAlert });
    } else {
      setFormData({ ...defaultAlertState, brokerId: brokers[0]?.id || "" });
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
      setError("Назва та топік є обов'язковими.");
      return;
    }
    if (!formData.brokerId) {
      setError("Будь ласка, оберіть брокера.");
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
        {formData.id ? "Редагувати алерт" : "Новий алерт"}
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
          label="Увімкнено (Слухати у фоні)"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Назва правила"
          name="name"
          value={formData.name}
          onChange={handleChange}
          sx={{ mb: 2 }}
          required
        />

        <TextField
          select
          fullWidth
          label="Брокер"
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
              Немає брокерів
            </MenuItem>
          )}
        </TextField>

        <TextField
          fullWidth
          label="Топік (напр. sensor/temp)"
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
            label="Умова"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
          >
            <MenuItem value=">">Більше (&gt;)</MenuItem>
            <MenuItem value="<">Менше (&lt;)</MenuItem>
            <MenuItem value="==">Дорівнює (==)</MenuItem>
            <MenuItem value="!=">Не дорівнює (!=)</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Поріг (Threshold)"
            name="threshold"
            value={formData.threshold}
            onChange={handleChange}
            type="text" // string support for == true/false
          />
        </Box>

        <TextField
          select
          fullWidth
          label="Інтервал повторення"
          name="intervalMs"
          value={formData.intervalMs || (5 * 60 * 1000)}
          onChange={handleChange}
          sx={{ mb: 2 }}
        >
          <MenuItem value={60 * 1000}>1 хвилина</MenuItem>
          <MenuItem value={5 * 60 * 1000}>5 хвилин</MenuItem>
          <MenuItem value={10 * 60 * 1000}>10 хвилин</MenuItem>
          <MenuItem value={30 * 60 * 1000}>30 хвилин</MenuItem>
          <MenuItem value={60 * 60 * 1000}>1 година</MenuItem>
          <MenuItem value={24 * 60 * 60 * 1000}>1 день</MenuItem>
        </TextField>

        <TextField
          fullWidth
          label="Шаблон повідомлення"
          name="messageTemplate"
          value={formData.messageTemplate}
          onChange={handleChange}
          sx={{ mb: 1 }}
          helperText="Використовуйте {value} та {topic} для підстановки."
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
        <Button onClick={onClose}>Скасувати</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AlertDialog;
