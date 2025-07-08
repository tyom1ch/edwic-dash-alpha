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

// Початковий стан віджета
const getInitialState = () => ({
  label: "",
  type: "",
  brokerId: "",
  value_template: "" // Додаємо поле для шаблону значення
});

/**
 * Допоміжна функція для отримання кількості знаків після коми з шаблону
 * @param {string | undefined} template - Рядок шаблону, напр. "{{ '%0.2f'|format(float(value)) }}"
 * @returns {number | string} - Кількість знаків або 'default', якщо форматування не знайдено
 */
const getDecimalsFromTemplate = (template) => {
  if (!template) return 'default';
  const match = template.match(/'%0\.(\d+)f'/);
  return match ? parseInt(match[1], 10) : 'default';
};

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

  // Спеціальний обробник для зміни заокруглення
  const handleDecimalChange = (e) => {
    const decimals = e.target.value;
    let newValueTemplate = "";

    if (decimals !== 'default' && typeof decimals === 'number') {
      // Генеруємо шаблон, який розуміє наш evaluateValueTemplate
      newValueTemplate = `{{ '%0.${decimals}f'|format(float(value)) }}`;
    }

    setLocalComponent(prev => ({
      ...prev,
      value_template: newValueTemplate
    }));
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
            <Accordion sx={{ mt: 2 }} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Налаштування топіків та відображення</Typography>
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

                  {/* --- НОВИЙ ЕЛЕМЕНТ: Вибір заокруглення --- */}
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel id="decimal-places-label">Заокруглення значення</InputLabel>
                    <Select
                      labelId="decimal-places-label"
                      label="Заокруглення значення"
                      value={getDecimalsFromTemplate(localComponent.value_template)}
                      onChange={handleDecimalChange}
                    >
                      <MenuItem value="default">Не заокруглювати</MenuItem>
                      <MenuItem value={0}>0 знаків після коми (напр. 123)</MenuItem>
                      <MenuItem value={1}>1 знак після коми (напр. 123.4)</MenuItem>
                      <MenuItem value={2}>2 знаки після коми (напр. 123.45)</MenuItem>
                      <MenuItem value={3}>3 знаки після коми (напр. 123.456)</MenuItem>
                    </Select>
                  </FormControl>

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