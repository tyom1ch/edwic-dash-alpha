// src/components/widgets/FanComponent.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Slider, Chip } from '@mui/material';
import { PowerSettingsNew } from '@mui/icons-material';
import FanIcon from '@mui/icons-material/ModeFanOff';
import useEntity from '../../hooks/useEntity';
import deviceRegistry from '../../core/DeviceRegistry';
import { ModernWidgetCard } from './ModernWidgetCard';

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

  // --- LOCAL STATE FOR SLIDER ---
  const [sliderValue, setSliderValue] = useState(null);

  useEffect(() => {
    if (typeof percentage === 'number') {
      setSliderValue(percentage);
    } else {
      setSliderValue(null);
    }
  }, [percentage]);
  // --- END LOCAL STATE ---

  const isOn = state === payload_on;
  const isOff = !isOn;
  const isReady = typeof state !== 'undefined';
  
  const hasSpeedControl = typeof percentage !== 'undefined';
  const hasPresets = preset_modes && preset_modes.length > 0;

  const handleToggle = () => {
    const value = isOn ? payload_off : payload_on;
    deviceRegistry.sendCommand(componentConfig.id, value, 'set_state');
  };
  
  const handleSpeedChange = (event, newValue) => {
    setSliderValue(newValue); // Update local state immediately
  };

  const handleSpeedChangeCommitted = (event, newValue) => {
    deviceRegistry.sendCommand(componentConfig.id, newValue, 'set_percentage');
  };
  
  const handlePresetChange = (preset) => {
    deviceRegistry.sendCommand(componentConfig.id, preset, 'set_preset_mode');
  };
  
  const label = componentConfig.label || entity?.name || "Вентилятор";

  return (
    <ModernWidgetCard 
      title={label}
      highlightColor={isOn ? "#03a9f4" : "transparent"}
      statusIcon={<FanIcon color={isOn ? 'primary' : 'disabled'} />}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Typography variant="body2" sx={{ color: isOn ? 'text.primary' : 'text.secondary', fontWeight: 'bold' }}>
            {isOn && hasSpeedControl ? `${sliderValue ?? percentage}%` : (isOn ? 'Увімкнено' : 'Вимкнено')}
          </Typography>
          <IconButton onClick={handleToggle} disabled={!isReady} edge="end">
            <PowerSettingsNew color={isOn ? 'primary' : 'action'} />
          </IconButton>
        </Box>
        
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, opacity: isOff ? 0.4 : 1, mt: 2 }}>
          {hasSpeedControl && (
            <Box>
              <Typography gutterBottom variant="body2">Швидкість</Typography>
              <Slider
                value={sliderValue ?? (typeof percentage === 'number' ? percentage : 0)}
                onChange={handleSpeedChange}
                onChangeCommitted={handleSpeedChangeCommitted}
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
    </ModernWidgetCard>
  );
};

export default FanComponent;
