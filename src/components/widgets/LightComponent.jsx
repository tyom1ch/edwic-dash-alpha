// --- START OF FILE LightComponent.jsx (ФІНАЛЬНА ВЕРСІЯ) ---

// src/components/widgets/LightComponent.jsx
import React from 'react';
import { 
    Card, CardContent, Typography, Box, Switch, Slider, 
    FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import { Lightbulb } from '@mui/icons-material';
import useEntity from '../../hooks/useEntity';
import commandDispatcher from '../../core/CommandDispatcher';

// TODO: В майбутньому можна додати компонент для вибору RGB кольору
// import { MuiColorInput } from 'mui-color-input';

const LightComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  // --- ЛОГІКА ВИЗНАЧЕННЯ МОЖЛИВОСТЕЙ (НОВИЙ ПІДХІД) ---

  // 1. Визначаємо, які функції підтримує пристрій на основі конфігурації
  const supportedModes = componentConfig.supported_color_modes || [];
  const supportsBrightness = componentConfig.brightness === true;
  const supportsColorTemp = supportedModes.includes('color_temp');
  const supportsRgb = supportedModes.includes('rgb') || supportedModes.includes('rgbw') || supportedModes.includes('rgbww');
  
  const getEffectList = () => {
    const effects = componentConfig.effect_list;
    if (Array.isArray(effects)) return effects;
    if (typeof effects === 'string' && effects.length > 0) return effects.split(',').map(e => e.trim());
    return [];
  };
  const effect_list = getEffectList();
  const supportsEffects = componentConfig.effect === true && effect_list.length > 0;
  
  // 2. Визначаємо, чи використовується схема JSON (з виправленням регістру)
  const isJsonSchema = componentConfig.schema?.toLowerCase() === 'json';

  // 3. Отримуємо поточний стан з MQTT
  const stateData = isJsonSchema ? entity?.json_state || {} : entity || {};

  const isOn = stateData.state === 'ON';
  const brightness = stateData.brightness; // Число від 0 до 255
  const colorTemp = stateData.color_temp; // Число (Mireds)
  const rgb = stateData.rgb; // {r, g, b}
  const effect = stateData.effect;

  const { 
    payload_on = 'ON', 
    payload_off = 'OFF' 
  } = componentConfig;
  
  const isReady = typeof stateData.state !== 'undefined';
  const isOff = !isOn;

  // --- ОБРОБНИКИ КОМАНД (залишаються без змін, вони вже універсальні) ---

  const handleToggle = (event) => {
    const value = event.target.checked ? payload_on : payload_off;
    if (isJsonSchema) {
      commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'json_command', value: { state: value } });
    } else {
      commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_state', value });
    }
  };
  
  const handleBrightnessChange = (event, newValue) => {
    const commandValue = { brightness: newValue };
     if (isOff && newValue > 0) {
      commandValue.state = payload_on; // Автоматично вмикаємо світло, якщо змінюємо яскравість
    }
    if (isJsonSchema) {
      commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'json_command', value: commandValue });
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

  // --- UI РЕНДЕРИНГ НА ОСНОВІ МОЖЛИВОСТЕЙ ---

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', width: '100%', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Lightbulb fontSize="large" color={isOff ? 'disabled' : 'warning'} />
          <Switch checked={isOn} onChange={handleToggle} disabled={!isReady} />
        </Box>
        
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, opacity: isOff ? 0.4 : 1, mt: 2 }}>
          {/* Показуємо слайдер, якщо пристрій ПІДТРИМУЄ яскравість */}
          {supportsBrightness && (
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

          {/* Показуємо слайдер, якщо пристрій ПІДТРИМУЄ температуру кольору */}
          {supportsColorTemp && (
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
          
          {/* TODO: Тут можна додати color picker, якщо supportsRgb === true */}

        </Box>

        {/* Показуємо список, якщо пристрій ПІДТРИМУЄ ефекти */}
        {supportsEffects && (
          <Box sx={{ mt: 'auto', pt: 1 }}>
            <FormControl fullWidth size="small" disabled={isOff}>
              <InputLabel id={`effect-select-label-${componentConfig.id}`}>Ефект</InputLabel>
              <Select
                labelId={`effect-select-label-${componentConfig.id}`}
                value={effect || ''}
                label="Ефект"
                onChange={(e) => handleEffectChange(e.target.value)}
              >
                {effect_list.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LightComponent;