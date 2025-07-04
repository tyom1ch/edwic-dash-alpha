// src/components/ComponentDialog.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField,
  MenuItem, Select, FormControl, InputLabel, Box, Accordion,
  AccordionSummary, AccordionDetails, Typography
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useAppConfig from "../hooks/useAppConfig";
import { WIDGET_REGISTRY, getWidgetByType } from "../core/widgetRegistry";

const getInitialState = () => ({
  label: "",
  type: "",
  brokerId: "",
});

function ComponentDialog({ isOpen, onClose, onSave, onAdd, component, isEdit }) {
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

  const selectedWidgetDef = useMemo(() => getWidgetByType(localComponent.type), [localComponent.type]);
  const topicFields = selectedWidgetDef?.topicFields || [];

  const isSaveDisabled = !localComponent.label || !localComponent.type || !localComponent.brokerId;

  const handleSave = () => {
    const action = isEdit ? onSave : onAdd;
    action(localComponent);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalComponent((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Редагувати віджет" : "Додати новий віджет"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            autoFocus required label="Назва віджета" name="label"
            value={localComponent.label} onChange={handleChange}
          />

          <FormControl fullWidth required>
            <InputLabel id="type-select-label">Тип віджета</InputLabel>
            <Select
              labelId="type-select-label" label="Тип віджета" name="type"
              value={localComponent.type} onChange={handleChange}
            >
              {WIDGET_REGISTRY.map((widget) => (
                <MenuItem key={widget.type} value={widget.type}>{widget.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel id="broker-select-label">MQTT Брокер</InputLabel>
            <Select
              labelId="broker-select-label" label="MQTT Брокер" name="brokerId"
              value={localComponent.brokerId} onChange={handleChange}
              disabled={availableBrokers.length === 0}
            >
              {availableBrokers.length === 0 ? (
                <MenuItem disabled>Спочатку додайте брокера</MenuItem>
              ) : (
                availableBrokers.map((broker) => (
                  <MenuItem key={broker.id} value={broker.id}>{broker.name || broker.host}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* --- Ось і наша динамічна "шторка" --- */}
          {topicFields.length > 0 && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Налаштування топіків</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Динамічно генеруємо поля для кожного топіка */}
                  {topicFields.map((fieldKey) => (
                    <TextField
                      key={fieldKey}
                      name={fieldKey}
                      label={fieldKey.replace(/_/g, ' ')} // Робимо назву поля читабельною
                      value={localComponent[fieldKey] || ''}
                      onChange={handleChange}
                      variant="outlined"
                      fullWidth
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Відмінити</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaveDisabled}>
          {isEdit ? 'Зберегти' : 'Додати'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ComponentDialog;