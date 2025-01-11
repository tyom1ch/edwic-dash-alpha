import React, { useEffect, useState } from 'react';
import { Switch, FormControlLabel, Typography, Card, CardContent } from '@mui/material';
import MQTTCore from '../core/MQTTCore';

const SwitchControl = ({ stateTopic, commandTopic, label }) => {
  const [state, setState] = useState(null); // Локальний стан
  const [isConnected, setIsConnected] = useState(false); // Стан підключення

  useEffect(() => {
    // Перевіряємо, чи є підключення
    setIsConnected(!!MQTTCore);

    // Отримуємо стан топіка при першому рендері
    const updateState = () => {
      const currentState = MQTTCore.getState(stateTopic); // Отримуємо стан через ядро
      setState(currentState);
    };

    updateState();

    // Оновлюємо стан кожні 1000 мс
    const interval = setInterval(updateState, 100);

    return () => clearInterval(interval); // Очищуємо інтервал при демонтажі
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
              disabled={!isConnected} // Вимикаємо кнопку, якщо немає з'єднання
            />
          }
          label={state === 'ON' ? 'ВКЛ.' : state === 'OFF' ? 'ВИКЛ.' : 'Немає даних'}
        />
      </CardContent>
    </Card>
  );
};

export default SwitchControl;
