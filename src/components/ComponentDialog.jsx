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

// ... getInitialState і getDecimalsFromTemplate залишаються без змін ...
const getInitialState = () => ({
  label: "",
  type: "",
  brokerId: "",
  value_template: "",
  variant: "single", 
});

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

  // Тепер отримуємо структурований список полів
  const configFields = useMemo(() => {
    if (selectedWidgetDef?.getConfigFields) {
      return selectedWidgetDef.getConfigFields(localComponent.variant);
    }
    return [];
  }, [selectedWidgetDef, localComponent.variant]);

  const isSaveDisabled = !localComponent.label || !localComponent.type || !localComponent.brokerId;

  const handleSave = () => {
    const action = isEdit ? onSave : onAdd;
    action(localComponent);
    onClose();
  };

  // --- "РОЗУМНИЙ" ОБРОБНИК ЗМІН ---
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Шукаємо визначення поля за його логічним `id` (який тепер є `name` інпута)
    const fieldDef = configFields.find(f => f.id === name);

    if (fieldDef) {
      // Це поле з налаштувань віджета (можливо, з аліасами)
      const primaryKey = fieldDef.keys[0]; // Перший ключ вважаємо основним
      const aliasKeys = fieldDef.keys.slice(1);

      setLocalComponent(prev => {
        const newState = { ...prev };
        // Встановлюємо значення для основного ключа
        newState[primaryKey] = value;
        // Видаляємо всі аліаси, щоб конфігурація була чистою
        aliasKeys.forEach(key => delete newState[key]);
        return newState;
      });
    } else {
      // Це звичайне поле, як-от 'label', 'type', 'brokerId'
      setLocalComponent((prev) => ({ ...prev, [name]: value }));
    }
  };
  
  const handleVariantChange = (e) => {
    const newVariant = e.target.value;
    // Отримуємо повні списки ключів для старого та нового варіантів
    const oldKeys = selectedWidgetDef.getConfigFields(localComponent.variant).flatMap(f => f.keys);
    const newKeys = selectedWidgetDef.getConfigFields(newVariant).flatMap(f => f.keys);
    
    const updatedComponent = { ...localComponent, variant: newVariant };
    const keysToRemove = oldKeys.filter(k => !newKeys.includes(k));
    keysToRemove.forEach(key => {
      delete updatedComponent[key];
    });

    setLocalComponent(updatedComponent);
  }

  // ... handleDecimalChange залишається без змін ...
  const handleDecimalChange = (e) => {
    const decimals = e.target.value;
    let newValueTemplate = "";

    if (decimals !== 'default' && typeof decimals === 'number') {
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
          {/* ... Основні поля залишаються без змін ... */}
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
          {selectedWidgetDef?.variants && (
             <FormControl fullWidth required>
              <InputLabel id="variant-select-label">Режим роботи</InputLabel>
              <Select
                labelId="variant-select-label" label="Режим роботи" name="variant"
                value={localComponent.variant} onChange={handleVariantChange}
              >
                {selectedWidgetDef.variants.map((variant) => (
                  <MenuItem key={variant.id} value={variant.id}>{variant.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
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
          
          {/* --- ОНОВЛЕНИЙ БЛОК РЕНДЕРИНГУ ПОЛІВ --- */}
          {configFields.length > 0 && (
            <Accordion sx={{ mt: 2 }} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Налаштування топіків та відображення</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {configFields.map((field) => {
                    // Знаходимо, яке з полів-аліасів зараз заповнене, щоб відобразити його значення
                    const currentKey = field.keys.find(key => localComponent[key] != null);
                    const currentValue = currentKey ? localComponent[currentKey] : '';
                    
                    return (
                      <TextField
                        key={field.id}
                        name={field.id} // Використовуємо логічний ID як ім'я для `handleChange`
                        label={field.label}
                        value={currentValue}
                        onChange={handleChange}
                        variant="outlined"
                        fullWidth
                      />
                    );
                  })}
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel id="decimal-places-label">Заокруглення значення</InputLabel>
                    <Select
                      labelId="decimal-places-label" label="Заокруглення значення"
                      value={getDecimalsFromTemplate(localComponent.value_template)} onChange={handleDecimalChange}
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