// src/components/widgets/ClimateComponent.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Select, MenuItem, Chip, Slider } from '@mui/material';
import { Add, Remove, Thermostat, PowerSettingsNew, AcUnit, WbSunny, AcUnit as AcUnitIcon } from '@mui/icons-material';
import useEntity from '../../hooks/useEntity';
import commandDispatcher from '../../core/CommandDispatcher';

const ClimateComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  const isRangeMode = componentConfig.variant === 'range';

  const currentTemperature = entity?.current_temperature ?? '---';
  const mode = entity?.mode ?? 'off';
  const action = entity?.action ?? 'idle';
  const presetMode = entity?.preset_mode;
  
  const targetTemperature = entity?.temperature ?? '---';
  
  const targetTempLow = entity?.temperature_low ?? '---';
  const targetTempHigh = entity?.temperature_high ?? '---';

  const { min_temp = 10, max_temp = 30, temp_step = 0.5, preset_modes = [] } = componentConfig;
  const isOff = mode === 'off';

  // --- LOCAL STATE FOR SLIDER ---
  const [sliderValue, setSliderValue] = useState(null);

  useEffect(() => {
    if (isRangeMode && targetTempLow !== '---' && targetTempHigh !== '---') {
      setSliderValue([parseFloat(targetTempLow), parseFloat(targetTempHigh)]);
    } else {
      setSliderValue(null);
    }
  }, [isRangeMode, targetTempLow, targetTempHigh]);
  // --- END LOCAL STATE ---

  const getModesArray = () => {
    const modesConfig = componentConfig.modes;
    if (Array.isArray(modesConfig)) return modesConfig.length > 0 ? modesConfig : ['off', 'heat'];
    if (typeof modesConfig === 'string' && modesConfig.trim().length > 0) return modesConfig.split(',').map(m => m.trim());
    return ['off', 'heat'];
  };
  const modes = getModesArray();

  const handleSingleTemperatureChange = (increment) => {
    if (targetTemperature === '---') return;
    const newTemp = parseFloat(targetTemperature) + increment;
    if (newTemp >= min_temp && newTemp <= max_temp) {
      commandDispatcher.dispatch({
        entityId: componentConfig.id,
        commandKey: 'set_temperature',
        value: newTemp.toFixed(1),
      });
    }
  };
  
  const handleRangeChange = (event, newValue) => {
      setSliderValue(newValue); // Update local state immediately
  };

  const handleRangeChangeCommitted = (event, newValue) => {
      const [newLow, newHigh] = newValue;
      if (targetTempLow === '---' || targetTempHigh === '---') return;

      if (newLow.toFixed(1) !== parseFloat(targetTempLow).toFixed(1)) {
        commandDispatcher.dispatch({
          entityId: componentConfig.id,
          commandKey: 'set_temperature_low',
          value: newLow.toFixed(1),
        });
      }
      if (newHigh.toFixed(1) !== parseFloat(targetTempHigh).toFixed(1)) {
        commandDispatcher.dispatch({
          entityId: componentConfig.id,
          commandKey: 'set_temperature_high',
          value: newHigh.toFixed(1),
        });
      }
  };

  const handleModeChange = (event) => {
    commandDispatcher.dispatch({
      entityId: componentConfig.id,
      commandKey: 'set_mode',
      value: event.target.value,
    });
  };

  const handlePresetChange = (preset) => {
    commandDispatcher.dispatch({
      entityId: componentConfig.id,
      commandKey: 'set_preset_mode',
      value: preset,
    });
  };

  let controls;
  if (isRangeMode) {
    const isRangeReady = targetTempLow !== '---' && targetTempHigh !== '---';
    const displayValue = sliderValue || (isRangeReady ? [parseFloat(targetTempLow), parseFloat(targetTempHigh)] : [min_temp, max_temp]);

    controls = (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 'auto', px: 2, opacity: isOff ? 0.4 : 1 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
          {isRangeReady ? `${displayValue[0].toFixed(1)}° - ${displayValue[1].toFixed(1)}°` : '---'}
        </Typography>
        <Slider
          value={displayValue}
          onChange={handleRangeChange}
          onChangeCommitted={handleRangeChangeCommitted}
          valueLabelDisplay="auto"
          min={min_temp}
          max={max_temp}
          step={temp_step}
          disabled={isOff || !isRangeReady}
        />
      </Box>
    );
  } else {
    controls = (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 'auto', opacity: isOff ? 0.4 : 1 }}>
        <IconButton onClick={() => handleSingleTemperatureChange(-temp_step)} disabled={isOff || targetTemperature === '---'}><Remove /></IconButton>
        <Typography variant="h4" sx={{ mx: 2, minWidth: '80px', textAlign: 'center', fontWeight: 'bold' }}>{targetTemperature}°</Typography>
        <IconButton onClick={() => handleSingleTemperatureChange(temp_step)} disabled={isOff || targetTemperature === '---'}><Add /></IconButton>
      </Box>
    );
  }

  const getActionProps = () => {
    switch (action) {
      case 'heating':
        return { color: 'error.main', icon: <WbSunny sx={{ color: 'white !important' }} /> };
      case 'cooling':
        return { color: 'info.main', icon: <AcUnitIcon sx={{ color: 'white !important' }} /> };
      default:
        return { color: 'text.secondary', icon: <PowerSettingsNew sx={{ color: 'white !important' }} /> };
    }
  };
  const actionProps = getActionProps();

  return (
    <Card variant='outlined' sx={{ height: '100%', display: 'flex' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          <Thermostat fontSize="large" color={isOff ? 'disabled' : 'action'} />
          <Typography variant="h3" sx={{ ml: 1, color: isOff ? 'text.secondary' : 'text.primary', fontWeight: 'bold' }}>
            {currentTemperature}°
          </Typography>
        </Box>
        
        {controls}

        {preset_modes && preset_modes.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', my: 1, flexWrap: 'wrap', opacity: isOff ? 0.4 : 1 }}>
            {preset_modes.map((p) => (
              <Chip
                key={p}
                label={p}
                clickable
                disabled={isOff}
                onClick={() => handlePresetChange(p)}
                color={presetMode === p ? 'primary' : 'default'}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
          <Select value={mode} onChange={handleModeChange} variant="standard" sx={{textTransform: 'capitalize'}}>
            {modes.map((m) => (<MenuItem key={m} value={m} sx={{textTransform: 'capitalize'}}>{m}</MenuItem>))}
          </Select>
          <Chip
            icon={actionProps.icon}
            label={action} size="small"
            sx={{ backgroundColor: actionProps.color, color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ClimateComponent;
