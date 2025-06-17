// src/components/widgets/FanComponent.jsx
import React from 'react';
import { Card, CardContent, Typography, Box, Switch, Slider, Stack } from '@mui/material';
import useEntity from '../../hooks/useEntity';
import commandDispatcher from '../../core/CommandDispatcher';
import FanIcon from '@mui/icons-material/Toys'; // Використаємо іконку пропелера

const FanComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);
  
  // ESPHome для 'fan' використовує 'ON'/'OFF' для стану і число 0-100 для швидкості
  const { 
    state_topic,
    command_topic,
    speed_state_topic,
    speed_command_topic
  } = componentConfig;
  
  // Стан ON/OFF беремо з основного топіка
  const isOn = entity?.value === 'ON';
  // Швидкість беремо з окремої сутності, яку ми створимо для швидкості
  // Припустимо, що у нас є інший useEntity для швидкості
  // Для простоти, поки що припустимо, що швидкість приходить в payload_on/off
  // АЛЕ КРАЩЕ РОЗШИРИТИ! Поки що імітуємо
  const speed = isOn ? (parseInt(entity?.speed, 10) || 50) : 0; // Це тимчасова імітація

  const handleToggle = (event) => {
    const commandValue = event.target.checked ? 'ON' : 'OFF';
    commandDispatcher.dispatch({
      entityId: componentConfig.id,
      // Тут треба знати, який command_topic використовувати
      // Поки що використовуємо основний
      value: commandValue,
    });
  };

  const handleSpeedChange = (event, newValue) => {
    // Тут треба буде відправляти команду на speed_command_topic
    console.log(`Setting speed to: ${newValue}`);
    // commandDispatcher.dispatch({ ... })
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <FanIcon sx={{ fontSize: 60, color: isOn ? 'primary.main' : 'text.disabled', transition: 'transform 0.5s', transform: isOn ? `rotate(${speed * 3.6}deg)` : 'none' }} />
        <Typography variant="h5" sx={{ mt: 2 }}>
          {isOn ? `ON - ${speed}%` : 'OFF'}
        </Typography>
        <Stack spacing={2} direction="row" sx={{ mt: 2, width: '80%' }} alignItems="center">
          <Typography>Off</Typography>
          <Switch checked={isOn} onChange={handleToggle} />
          <Typography>On</Typography>
        </Stack>
        <Slider
          aria-label="Speed"
          value={speed}
          onChange={handleSpeedChange}
          step={10}
          marks
          min={0}
          max={100}
          disabled={!isOn}
          sx={{ mt: 1, width: '80%' }}
        />
      </CardContent>
    </Card>
  );
};

export default FanComponent;