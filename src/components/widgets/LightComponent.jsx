// src/components/widgets/LightComponent.jsx
import React, { useState, useEffect } from 'react';
import { 
    Card, CardContent, Typography, Box, Switch, Slider, 
    FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import { Lightbulb } from '@mui/icons-material';
import { MuiColorInput } from 'mui-color-input'; 
import useEntity from '../../hooks/useEntity';
import commandDispatcher from '../../core/CommandDispatcher';

const hexToRgb = (hex) => {
    if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace("#", ""));
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
};

const LightComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);
  const stateData = { ...componentConfig, ...entity };

  const {
    payload_on = 'ON',
    payload_off = 'OFF',
    brightness_scale = 255,
    brightness_state_topic,
    color_temp_state_topic,
    rgb_state_topic,
    min_mireds = 153,
    max_mireds = 500,
  } = stateData;

  // +++ ГОЛОВНИЙ ФІКС ТУТ +++
  const supportsBrightness = !!brightness_state_topic;
  const supportsColorTemp = !!color_temp_state_topic;
  const supportsRgb = !!rgb_state_topic;

  const isOn = stateData.state == '1';
  const currentBrightness = stateData.brightness;
  const currentColorTemp = stateData.color_temp;
  const currentRgbHex = stateData.rgb;

  const [brightnessValue, setBrightnessValue] = useState(null);
  const [colorTempValue, setColorTempValue] = useState(null);
  const [colorValue, setColorValue] = useState('#000000');

  useEffect(() => setBrightnessValue(parseFloat(currentBrightness) || null), [currentBrightness]);
  useEffect(() => setColorTempValue(parseFloat(currentColorTemp) || null), [currentColorTemp]);
  useEffect(() => {
    if (currentRgbHex) {
        setColorValue(`#${currentRgbHex.replace("#", "")}`);
    }
  }, [currentRgbHex]);

  const isReady = typeof stateData.state !== 'undefined' && stateData.state !== null;
  const isOff = !isOn;

  // Обробники команд
  const handleToggle = (event) => {
    const valueToSend = event.target.checked ? payload_on : payload_off;
    commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_state', value: valueToSend });
  };
  const handleBrightnessChangeCommitted = (event, newValue) => {
    commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_brightness', value: newValue });
  };
  const handleColorTempChangeCommitted = (event, newValue) => {
    commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_color_temp', value: newValue });
  };
  const handleColorChange = (newColor) => {
    setColorValue(newColor);
    commandDispatcher.dispatch({ 
        entityId: componentConfig.id, 
        commandKey: 'set_rgb', 
        value: hexToRgb(newColor) 
    });
  };
  const handleBrightnessChange = (e, v) => setBrightnessValue(v);
  const handleColorTempChange = (e, v) => setColorTempValue(v);

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', width: '100%', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Lightbulb fontSize="large" color={isOff ? 'disabled' : 'warning'} />
          <Switch checked={isOn} onChange={handleToggle} disabled={!isReady} />
        </Box>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, opacity: isOff ? 0.4 : 1, mt: 2 }}>
          {supportsBrightness && ( <Box> <Typography gutterBottom variant="body2">Яскравість</Typography> <Slider value={brightnessValue ?? 0} onChange={handleBrightnessChange} onChangeCommitted={handleBrightnessChangeCommitted} min={0} max={parseInt(brightness_scale, 10) || 100} step={1} disabled={isOff} valueLabelDisplay="auto" /> </Box> )}
          {supportsColorTemp && ( <Box> <Typography gutterBottom variant="body2">Температура</Typography> <Slider value={colorTempValue ?? min_mireds} onChange={handleColorTempChange} onChangeCommitted={handleColorTempChangeCommitted} min={min_mireds} max={max_mireds} disabled={isOff} valueLabelDisplay="auto" marks={[{value: min_mireds, label: 'Холодний'}, {value: max_mireds, label: 'Теплий'}]} /> </Box> )}
          {supportsRgb && ( <Box> <Typography gutterBottom variant="body2">Колір</Typography> <MuiColorInput value={colorValue} onChange={handleColorChange} format="hex" disabled={isOff} fullWidth /> </Box> )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default LightComponent;