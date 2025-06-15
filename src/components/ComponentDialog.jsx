// src/components/ComponentDialog.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import useAppConfig from '../hooks/useAppConfig'; // Нам потрібен доступ до брокерів

// Початковий стан для нового компонента
const getInitialState = () => ({
  label: '',
  type: '',
  brokerId: '',
  state_topic: '',
  command_topic: '',
  unit_of_measurement: '',
});

function ComponentDialog({ isOpen, onClose, onSave, onAdd, component, isEdit }) {
  // Використовуємо наш головний хук, щоб отримати список доступних брокерів
  const { appConfig } = useAppConfig();
  const availableBrokers = appConfig.brokers || [];

  const [localComponent, setLocalComponent] = useState(getInitialState());

  // Ефект для заповнення форми при редагуванні або очищення при додаванні
  useEffect(() => {
    if (isOpen) {
      if (isEdit && component) {
        // Заповнюємо форму даними існуючого компонента
        setLocalComponent({ ...getInitialState(), ...component });
      } else {
        // Скидаємо форму до початкового стану для нового компонента
        setLocalComponent(getInitialState());
      }
    }
  }, [isOpen, isEdit, component]);

  // Перевіряємо, чи можна натискати кнопку "Зберегти"
  const isSaveDisabled = useMemo(() => {
    if (!localComponent.label || !localComponent.type || !localComponent.brokerId) {
      return true; // Основні поля мають бути заповнені
    }
    if (!localComponent.state_topic && !localComponent.command_topic) {
      return true; // Хоча б один топік має бути
    }
    return false;
  }, [localComponent]);

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
  
  // Визначаємо, які поля показувати на основі обраного типу компонента
  const showStateTopic = ['sensor', 'switch'].includes(localComponent.type);
  const showCommandTopic = ['switch', 'input', 'slider'].includes(localComponent.type);
  const showUnit = localComponent.type === 'sensor';

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Редагувати віджет' : 'Додати новий віджет'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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
              <MenuItem value="sensor">Сенсор (тільки читання)</MenuItem>
              <MenuItem value="switch">Перемикач (ON/OFF)</MenuItem>
              <MenuItem value="input">Поле вводу (текст/число)</MenuItem>
              <MenuItem value="slider">Слайдер</MenuItem>
            </Select>
          </FormControl>
          
          {/* --- НАЙВАЖЛИВІШЕ: ВИБІР БРОКЕРА --- */}
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
              {availableBrokers.length === 0 && (
                  <MenuItem disabled>Спочатку додайте брокера в налаштуваннях</MenuItem>
              )}
              {availableBrokers.map((broker) => (
                <MenuItem key={broker.id} value={broker.id}>
                  {broker.name || broker.host}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Налаштування топіків
          </Typography>

          {showStateTopic && (
            <TextField
              label="Топік стану (State Topic)"
              placeholder="home/sensor/temperature"
              name="state_topic"
              value={localComponent.state_topic}
              onChange={handleChange}
            />
          )}

          {showCommandTopic && (
            <TextField
              label="Топік команд (Command Topic)"
              placeholder="home/light/set"
              name="command_topic"
              value={localComponent.command_topic}
              onChange={handleChange}
            />
          )}

          {showUnit && (
             <FormControl fullWidth>
                <InputLabel id="unit-select-label">Одиниці виміру</InputLabel>
                <Select
                  labelId="unit-select-label"
                  label="Одиниці виміру"
                  name="unit_of_measurement"
                  value={localComponent.unit_of_measurement}
                  onChange={handleChange}
                >
                  <MenuItem value=""><em>Не вказано</em></MenuItem>
                  <MenuItem value="°C">°C (градуси Цельсія)</MenuItem>
                  <MenuItem value="%">% (відсотки)</MenuItem>
                  <MenuItem value="W">W (вати)</MenuItem>
                  <MenuItem value="V">V (вольти)</MenuItem>
                  <MenuItem value="Pa">Pa (паскалі)</MenuItem>
                  <MenuItem value="ppm">ppm (частки на мільйон)</MenuItem>
                </Select>
              </FormControl>
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