// src/components/ComponentDialog.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, MenuItem, Select,
  FormControl, InputLabel, Box, Accordion, AccordionSummary, AccordionDetails, Typography,
  FormControlLabel, Checkbox
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useAppConfig from "../hooks/useAppConfig";
import { WIDGET_REGISTRY, getWidgetByType } from "../core/widgetRegistry";

const getInitialState = () => ({
  label: "",
  type: "",
  brokerId: "",
  value_template: "",
  variant: "single",
});

const getDecimalsFromTemplate = (template) => {
  if (!template) return "default";
  const match = template.match(/'%0\.(\d+)f'/);
  return match ? parseInt(match[1], 10) : "default";
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

  // --- ЛОГІКА РОЗДІЛЕННЯ ПОЛІВ ---
  const configFields = useMemo(() => {
    if (selectedWidgetDef?.getConfigFields) {
      return selectedWidgetDef.getConfigFields(localComponent.variant);
    }
    return [];
  }, [selectedWidgetDef, localComponent.variant]);

  const editableFields = useMemo(() => configFields.filter(f => !f.isInfo), [configFields]);
  const infoFields = useMemo(() => configFields.filter(f => f.isInfo), [configFields]);
  // ---------------------------------

  const isSaveDisabled = !localComponent.label || !localComponent.type || !localComponent.brokerId;

  const handleSave = () => {
    const action = isEdit ? onSave : onAdd;
    action(localComponent);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const fieldDef = configFields.find((f) => f.id === name);

    if (fieldDef) {
      const primaryKey = fieldDef.keys[0];
      const aliasKeys = fieldDef.keys.slice(1);

      setLocalComponent((prev) => {
        const newState = { ...prev };
        newState[primaryKey] = value;
        aliasKeys.forEach((key) => delete newState[key]);
        return newState;
      });
    } else {
      setLocalComponent((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleVariantChange = (e) => {
    const newVariant = e.target.value;
    const oldKeys = selectedWidgetDef.getConfigFields(localComponent.variant).flatMap((f) => f.keys);
    const newKeys = selectedWidgetDef.getConfigFields(newVariant).flatMap((f) => f.keys);

    const updatedComponent = { ...localComponent, variant: newVariant };
    const keysToRemove = oldKeys.filter((k) => !newKeys.includes(k));
    keysToRemove.forEach((key) => {
      delete updatedComponent[key];
    });

    setLocalComponent(updatedComponent);
  };

  const handleDecimalChange = (e) => {
    const decimals = e.target.value;
    let newValueTemplate = "";

    if (decimals !== "default" && typeof decimals === "number") {
      newValueTemplate = `{{ '%0.${decimals}f'|format(float(value)) }}`;
    }

    setLocalComponent((prev) => ({
      ...prev,
      value_template: newValueTemplate,
    }));
  };

  const renderField = (field) => {
    const currentKey = field.keys.find((key) => localComponent[key] != null);
    const currentValue = currentKey ? localComponent[currentKey] : "";

    if (Array.isArray(field.modes)) {
      return (
        <FormControl fullWidth key={field.id} sx={{ mt: 1 }}>
          <InputLabel id={`${field.id}-label`}>{field.label}</InputLabel>
          <Select
            labelId={`${field.id}-label`}
            label={field.label}
            name={field.id}
            value={currentValue}
            onChange={handleChange}
          >
            {field.modes.map((option, key) => (
              <MenuItem key={key} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        key={field.id}
        name={field.id}
        label={field.label}
        value={currentValue}
        onChange={handleChange}
        variant="outlined"
        fullWidth
      />
    );
  };

  const renderInfoField = (field) => {
    const currentKey = field.keys.find((key) => localComponent[key] != null);
    const currentValue = currentKey ? localComponent[currentKey] : undefined;

    if (currentValue === undefined) return null;

    if (typeof currentValue === 'boolean') {
      return (
        <FormControlLabel
          key={field.id}
          control={<Checkbox checked={currentValue} disabled />}
          label={field.label}
          sx={{width: '100%'}}
        />
      );
    }

    const displayValue = (typeof currentValue === 'object' && currentValue !== null)
      ? JSON.stringify(currentValue, null, 2)
      : String(currentValue);
      
    return (
      <TextField
        key={field.id}
        label={field.label}
        value={displayValue}
        variant="outlined"
        fullWidth
        multiline={typeof currentValue === 'object'}
        maxRows={5}
        InputProps={{
          readOnly: true,
        }}
        sx={{
            '& .MuiInputBase-input.Mui-disabled': {
                WebkitTextFillColor: '#000000',
            },
            '& .MuiFormLabel-root.Mui-disabled': {
                color: 'rgba(0, 0, 0, 0.6)'
            }
        }}
      />
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Редагувати віджет" : "Додати новий віджет"}</DialogTitle>
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
          {selectedWidgetDef?.variants && (
            <FormControl fullWidth required>
              <InputLabel id="variant-select-label">Режим роботи</InputLabel>
              <Select
                labelId="variant-select-label"
                label="Режим роботи"
                name="variant"
                value={localComponent.variant}
                onChange={handleVariantChange}
              >
                {selectedWidgetDef.variants.map((variant) => (
                  <MenuItem key={variant.id} value={variant.id}>
                    {variant.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth required>
            <InputLabel id="broker-select-label">MQTT Брокер</InputLabel>
            <Select
              labelId="broker-select-label"
              label="MQTT Брокер"
              name="brokerId"
              value={localComponent.brokerId}
              onChange={handleChange}
              disabled={availableBrokers.length === 0}
            >
              {availableBrokers.length === 0 ? (
                <MenuItem disabled>Спочатку додайте брокера</MenuItem>
              ) : (
                availableBrokers.map((broker) => (
                  <MenuItem key={broker.id} value={broker.id}>
                    {broker.name || broker.host}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {editableFields.length > 0 && (
            <Accordion sx={{ mt: 2 }} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Налаштування топіків та відображення</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {editableFields.map(renderField)}
                  
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel id="decimal-places-label">Заокруглення значення</InputLabel>
                    <Select
                      labelId="decimal-places-label"
                      label="Заокруглення значення"
                      value={getDecimalsFromTemplate(localComponent.value_template)}
                      onChange={handleDecimalChange}
                    >
                      <MenuItem value="default">Не заокруглювати</MenuItem>
                      <MenuItem value={0}>0 знаків (123)</MenuItem>
                      <MenuItem value={1}>1 знак (123.4)</MenuItem>
                      <MenuItem value={2}>2 знаки (123.45)</MenuItem>
                      <MenuItem value={3}>3 знаки (123.456)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {infoFields.length > 0 && (
            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Інформація з MQTT Discovery</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {infoFields.map(renderInfoField).filter(Boolean)}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Відмінити</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaveDisabled}>
          {isEdit ? "Зберегти" : "Додати"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ComponentDialog;