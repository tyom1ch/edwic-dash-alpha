// src/components/widgets/LightComponent.jsx
import React, { useState, useEffect } from 'react';
import { 
    Card, CardContent, Typography, Box, Switch, Slider, 
    FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import { Lightbulb } from '@mui/icons-material';
import { MuiColorInput } from 'mui-color-input'; 
import useEntity from '../../hooks/useEntity';
import deviceRegistry from '../../core/DeviceRegistry';
import { ModernWidgetCard } from './ModernWidgetCard';

const hexToRgbString = (hex) => {
    if (!hex || typeof hex !== 'string') return '#0000000000';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace("#", ""));
    return result ? `#${result[1]}${result[2]}${result[3]}0000` : '#0000000000';
};

const LightComponent = ({ componentConfig }) => {
  const entityState = useEntity(componentConfig.id) || {};
  
  const {
    // Статична конфігурація з `componentConfig`, яку згенерував `widgetRegistry`
    brokerId,
    state_topic,
    command_topic,
    brightness_state_topic,
    brightness_command_topic,
    color_temp_state_topic,
    color_temp_command_topic,
    rgb_state_topic,
    rgb_command_topic,
    min_mireds = 153,
    max_mireds = 500,
  } = componentConfig;

  // Динамічний стан з MQTT, який приходить через `useEntity`
  const {
    state,
    brightness,
    color_temp,
    rgb,
  } = entityState;

  // Вирішуємо, що показувати, на основі НАЯВНОСТІ топіків у конфігурації
  const supportsBrightness = !!brightness_state_topic;
  const supportsColorTemp = !!color_temp_state_topic;
  const supportsRgb = !!rgb_state_topic;

  // Перевірка стану. `state` - це значення з MQTT.
  const isOn = state == '1';
  
  // Локальний стан для плавності UI
  const [brightnessValue, setBrightnessValue] = useState(null);
  const [colorTempValue, setColorTempValue] = useState(null);
  const [colorValue, setColorValue] = useState('#000000');

  useEffect(() => {
    const numericValue = parseFloat(brightness);
    if (!isNaN(numericValue)) setBrightnessValue(numericValue);
  }, [brightness]);
  
  useEffect(() => {
    const numericValue = parseFloat(color_temp);
    if (!isNaN(numericValue)) setColorTempValue(numericValue);
  }, [color_temp]);

  useEffect(() => {
    if (rgb && typeof rgb === 'string' && !rgb.includes('/')) {
        setColorValue(`#${rgb.replace("#", "")}`);
    }
  }, [rgb]);

  const isReady = typeof state !== 'undefined' && state !== null;
  const isOff = !isOn;

  // Обробники UI-елементів (без прямих мережних викликів)
  const handleToggle = (event) => {
    deviceRegistry.sendCommand(componentConfig.id, event.target.checked ? '1' : '0', 'default');
  };
  const handleBrightnessChangeCommitted = (event, newValue) => {
    deviceRegistry.sendCommand(componentConfig.id, newValue, 'set_brightness');
  };
  const handleColorTempChangeCommitted = (event, newValue) => {
    deviceRegistry.sendCommand(componentConfig.id, newValue, 'set_color_temp');
  };
  const handleColorChange = (newColor) => {
    setColorValue(newColor);
    deviceRegistry.sendCommand(componentConfig.id, hexToRgbString(newColor), 'set_rgb');
  };

  const label = componentConfig.label || entityState?.name || "Освітлення";
  const handleBrightnessChange = (e, v) => setBrightnessValue(v);
  const handleColorTempChange = (e, v) => setColorTempValue(v);

  return (
    <ModernWidgetCard 
      title={label}
      highlightColor={isOn ? "#ffb300" : "transparent"}
      statusIcon={<Lightbulb color={isOff ? 'disabled' : 'warning'} />}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Typography variant="body2" color={isOn ? "text.primary" : "text.secondary"}>
             {isReady ? (isOn ? 'Увімкнено' : 'Вимкнено') : 'Немає зв\'язку'}
          </Typography>
          <Switch checked={isOn} onChange={handleToggle} disabled={!isReady} />
        </Box>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, opacity: isOff ? 0.4 : 1, mt: 2 }}>
          {supportsBrightness && (
            <Box>
              <Typography gutterBottom variant="body2">Яскравість</Typography>
              <Slider value={brightnessValue ?? 0} onChange={handleBrightnessChange} onChangeCommitted={handleBrightnessChangeCommitted} min={0} max={100} step={1} disabled={isOff} valueLabelDisplay="auto" />
            </Box>
          )}
          {supportsColorTemp && (
            <Box>
              <Typography gutterBottom variant="body2">Температура</Typography>
              <Slider value={colorTempValue ?? min_mireds} onChange={handleColorTempChange} onChangeCommitted={handleColorTempChangeCommitted} min={min_mireds} max={max_mireds} disabled={isOff} valueLabelDisplay="auto" marks={[{value: min_mireds, label: 'Холодний'}, {value: max_mireds, label: 'Теплий'}]} />
            </Box>
          )}
          {supportsRgb && (
            <Box>
              <Typography gutterBottom variant="body2">Колір</Typography>
              <MuiColorInput value={colorValue} onChange={handleColorChange} format="hex" disabled={isOff} fullWidth />
            </Box>
          )}
        </Box>
    </ModernWidgetCard>
  );
};

export default LightComponent;