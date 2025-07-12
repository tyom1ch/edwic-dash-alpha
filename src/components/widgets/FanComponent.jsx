// src/components/widgets/FanComponent.jsx
import React from 'react';
import { Card, CardContent, Typography, Box, IconButton, Slider, Chip } from '@mui/material';
import { PowerSettingsNew } from '@mui/icons-material';
import FanIcon from '@mui/icons-material/ModeFanOff';
import useEntity from '../../hooks/useEntity';
import commandDispatcher from '../../core/CommandDispatcher';

const FanComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  const {
    payload_on = 'ON',
    payload_off = 'OFF',
    preset_modes = [],
  } = componentConfig;

  const state = entity?.state;
  const percentage = entity?.percentage; // Число від 0 до 100
  const presetMode = entity?.preset_mode;

  const isOn = state === payload_on;
  const isOff = !isOn;
  const isReady = typeof state !== 'undefined';
  
  const hasSpeedControl = typeof percentage !== 'undefined';
  const hasPresets = preset_modes && preset_modes.length > 0;

  const handleToggle = () => {
    const value = isOn ? payload_off : payload_on;
    commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_state', value });
  };
  
  const handleSpeedChange = (event, newValue) => {
    commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_percentage', value: newValue });
  };
  
  const handlePresetChange = (preset) => {
    commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_preset_mode', value: preset });
  };
  
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', width: '100%', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FanIcon fontSize="large" sx={{ color: isOn ? 'primary.main' : 'text.disabled' }} />
          <Typography variant="h5" sx={{ color: isOn ? 'text.primary' : 'text.secondary' }}>
            {isOn && hasSpeedControl ? `${percentage}%` : (isOn ? 'Увімкнено' : 'Вимкнено')}
          </Typography>
          <IconButton onClick={handleToggle} disabled={!isReady}>
            <PowerSettingsNew color={isOn ? 'primary' : 'action'} />
          </IconButton>
        </Box>
        
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, opacity: isOff ? 0.4 : 1, mt: 2 }}>
          {hasSpeedControl && (
            <Box>
              <Typography gutterBottom variant="body2">Швидкість</Typography>
              <Slider
                value={typeof percentage === 'number' ? percentage : 0}
                onChangeCommitted={handleSpeedChange}
                min={0}
                max={100}
                step={componentConfig.speed_range_step || 1}
                disabled={isOff}
                valueLabelDisplay="auto"
              />
            </Box>
          )}
        </Box>
        
        {hasPresets && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 'auto', flexWrap: 'wrap', opacity: isOff ? 0.4 : 1 }}>
            {preset_modes.map((p) => (
              <Chip
                key={p}
                label={p}
                clickable
                disabled={isOff}
                onClick={() => handlePresetChange(p)}
                color={presetMode === p ? 'primary' : 'default'}
                size="small"
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default FanComponent;