import React, { useEffect, useState } from 'react';
import { Switch, FormControlLabel, Typography, Card, CardContent } from '@mui/material';
import MQTTCore from '../core/MQTTCore';

const SwitchControl = ({ stateTopic, commandTopic, label }) => {
  const [state, setState] = useState(null); // Локальний стан

  useEffect(() => {
    const handleUpdate = (newState) => {
      setState(newState);
    };
    // Підписуємося на зміни
    MQTTCore.subscribe(stateTopic, handleUpdate);
  }, [stateTopic]);

  const handleToggle = (event) => {
    const newState = event.target.checked ? 'ON' : 'OFF';
    MQTTCore.sendMessage(commandTopic, newState); // Відправляємо команду через ядро
  };

  return (
    <Card variant="outlined" sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{label}</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={state === 'ON'} // Встановлюємо стан кнопки
              onChange={handleToggle}
              color="primary"
              disabled={!state} // Вимикаємо кнопку, якщо немає з'єднання
            />
          }
          label={state === 'ON' ? 'ВКЛ.' : state === 'OFF' ? 'ВИКЛ.' : 'Немає даних'}
        />
      </CardContent>
    </Card>
  );
};

export default SwitchControl;
