// src/components/ComponentDialog.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Grid,
} from "@mui/material";
import useAppConfig from "../hooks/useAppConfig";
// 1. Імпортуємо наш новий реєстр!
import {
  WIDGET_REGISTRY,
  getWidgetByType,
} from "../components/widgets/widgetRegistry";

const getInitialState = () => ({
  label: "",
  type: "",
  brokerId: "",
  state_topic: "",
  command_topic: "",
  unit_of_measurement: "",
  payload_on: "1",
  payload_off: "0",
});

function ComponentDialog({
  isOpen,
  onClose,
  onSave,
  onAdd,
  component,
  isEdit,
}) {
  const { appConfig } = useAppConfig();
  const availableBrokers = appConfig.brokers || [];
  const [localComponent, setLocalComponent] = useState(getInitialState());

  useEffect(() => {
    if (isOpen) {
      if (isEdit && component) {
        setLocalComponent({ ...getInitialState(), ...component });
      } else {
        setLocalComponent(getInitialState());
      }
    }
  }, [isOpen, isEdit, component]);

  // Знаходимо опис поточного вибраного віджета
  const selectedWidgetDef = useMemo(
    () => getWidgetByType(localComponent.type),
    [localComponent.type]
  );

  const isSaveDisabled = useMemo(() => {
    if (
      !localComponent.label ||
      !localComponent.type ||
      !localComponent.brokerId
    )
      return true;
    // Динамічна валідація на основі полів з реєстру
    if (
      selectedWidgetDef?.fields.includes("state_topic") &&
      !localComponent.state_topic
    )
      return true;
    return false;
  }, [localComponent, selectedWidgetDef]);

  const handleSave = () => {
    if (isEdit) {
      onSave(localComponent);
    } else {
      onAdd(localComponent);
    }
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalComponent((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? "Редагувати віджет" : "Додати новий віджет"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            autoFocus
            required
            label="Назва віджета"
            name="label"
            value={localComponent.label}
            onChange={handleChange}
          />

          {/* 2. Динамічно будуємо список віджетів */}
          <FormControl fullWidth required>
            <InputLabel id="type-select-label">Тип віджета</InputLabel>
            <Select
              labelId="type-select-label"
              label="Тип віджета"
              name="type"
              value={localComponent.type}
              onChange={handleChange}
            >
              {WIDGET_REGISTRY.map((widget) => (
                <MenuItem key={widget.type} value={widget.type}>
                  {widget.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            {/* ... вибір брокера без змін ... */}
          </FormControl>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Налаштування топіків
          </Typography>

          {/* 3. Динамічно показуємо поля на основі реєстру */}
          {selectedWidgetDef?.fields.includes("state_topic") && (
            <TextField
              label="Топік стану (State Topic)"
              name="state_topic"
              value={localComponent.state_topic || ""}
              onChange={handleChange}
            />
          )}
          {selectedWidgetDef?.fields.includes("command_topic") && (
            <TextField
              label="Топік команд (Command Topic)"
              name="command_topic"
              value={localComponent.command_topic || ""}
              onChange={handleChange}
            />
          )}
          {selectedWidgetDef?.fields.includes("payload_on") &&
            selectedWidgetDef?.fields.includes("payload_off") && (
              <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Payload ON"
                    name="payload_on"
                    value={localComponent.payload_on || ""}
                    onChange={handleChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Payload OFF"
                    name="payload_off"
                    value={localComponent.payload_off || ""}
                    onChange={handleChange}
                    fullWidth
                  />
                </Grid>
              </Grid>
            )}
          {selectedWidgetDef?.fields.includes("unit_of_measurement") && (
            <FormControl fullWidth>
              {/* ... вибір одиниць виміру без змін ... */}
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions>{/* ... кнопки без змін ... */}</DialogActions>
    </Dialog>
  );
}

export default ComponentDialog;
