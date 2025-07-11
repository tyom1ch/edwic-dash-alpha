// src/components/widgets/LightComponent.jsx
import React from 'react';
import { Card, CardContent, Typography, Box, Switch, Slider, Chip } from '@mui/material';
import { Lightbulb, WbIncandescent, ColorLens } from '@mui/icons-material';
import useEntity from '../../hooks/useEntity';
import commandDispatcher from '../../core/CommandDispatcher';

const LightComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  // Визначаємо, чи використовується схема JSON
  const isJsonSchema = componentConfig.schema === 'json';

  // Отримуємо стан в залежності від схеми
  const stateData = isJsonSchema ? entity?.json_state || {} : entity || {};

  const isOn = stateData.state === 'ON';
  const brightness = stateData.brightness; // Число від 0 до 255
  const colorTemp = stateData.color_temp; // Число (Mireds)
  const rgb = stateData.rgb; // Масив [r, g, b] або рядок "r,g,b"
  const effect = stateData.effect;
  
  const { 
    effect_list = [], 
    payload_on = 'ON', 
    payload_off = 'OFF' 
  } = componentConfig;
  
  const isReady = typeof stateData.state !== 'undefined';
  const isOff = !isOn;

  // --- Обробники команд ---

  const handleToggle = (event) => {
    const value = event.target.checked ? payload_on : payload_off;
    if (isJsonSchema) {
      commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'json_command', value: { state: value } });
    } else {
      commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_state', value });
    }
  };
  
  const handleBrightnessChange = (event, newValue) => {
    if (isJsonSchema) {
      commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'json_command', value: { brightness: newValue } });
    } else {
      commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_brightness', value: newValue });
    }
  };

  const handleColorTempChange = (event, newValue) => {
    if (isJsonSchema) {
        commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'json_command', value: { color_temp: newValue } });
    } else {
        commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_color_temp', value: newValue });
    }
  };
  
  const handleEffectChange = (selectedEffect) => {
    if (isJsonSchema) {
      commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'json_command', value: { effect: selectedEffect } });
    } else {
      commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_effect', value: selectedEffect });
    }
  };

  // Визначення, які контроли показувати
  const hasBrightness = typeof brightness !== 'undefined';
  const hasColorTemp = typeof colorTemp !== 'undefined';
  const hasEffects = effect_list && effect_list.length > 0;

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', width: '100%', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Lightbulb fontSize="large" color={isOff ? 'disabled' : 'warning'} />
          <Switch checked={isOn} onChange={handleToggle} disabled={!isReady} />
        </Box>
        
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, opacity: isOff ? 0.4 : 1, mt: 2 }}>
          {hasBrightness && (
            <Box>
              <Typography gutterBottom variant="body2">Яскравість</Typography>
              <Slider
                value={typeof brightness === 'number' ? brightness : 0}
                onChangeCommitted={handleBrightnessChange}
                min={0}
                max={255}
                step={1}
                disabled={isOff}
                valueLabelDisplay="auto"
              />
            </Box>
          )}

          {hasColorTemp && (
             <Box>
              <Typography gutterBottom variant="body2">Температура</Typography>
              <Slider
                value={typeof colorTemp === 'number' ? colorTemp : 153}
                onChangeCommitted={handleColorTempChange}
                min={componentConfig.min_mireds || 153} // ~6500K
                max={componentConfig.max_mireds || 500} // ~2000K
                disabled={isOff}
                valueLabelDisplay="auto"
                marks={[{value: 153, label: 'Холодний'}, {value: 500, label: 'Теплий'}]}
              />
            </Box>
          )}
        </Box>

        {hasEffects && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 'auto', flexWrap: 'wrap', opacity: isOff ? 0.4 : 1 }}>
            {effect_list.map((p) => (
              <Chip
                key={p}
                label={p}
                clickable
                disabled={isOff}
                onClick={() => handleEffectChange(p)}
                color={effect === p ? 'primary' : 'default'}
                size="small"
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LightComponent;