import React, { useEffect, useState } from 'react';
import { Typography, Card, CardContent } from '@mui/material';
import MQTTCore from '../core/MQTTCore'; // Імпортуємо MQTTCore

const SensorComponent = ({ stateTopic, label, measureUnit }) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    const handleUpdate = (newState) => {
      setState(newState); // Оновлюємо стан при зміні топіка
    };

    // Підписуємося на оновлення для вказаного топіка
    MQTTCore.subscribe(stateTopic, handleUpdate);

    // Ініціалізуємо початковий стан
    const initialState = MQTTCore.getState(stateTopic);
    if (initialState !== null) {
      setState(initialState);
    }

    // Відписуємося при демонтажі компонента
    return () => {
      MQTTCore.unsubscribe(stateTopic, handleUpdate);
    };
  }, [stateTopic]);

  return (
    <Card variant="outlined" sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Typography variant="h4">{label}</Typography>
        <Typography variant="h6">
          {state !== null ? state : 'Очікування даних...'}
          &nbsp;
          {measureUnit}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SensorComponent;
