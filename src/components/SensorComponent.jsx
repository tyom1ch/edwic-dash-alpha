import React, { useEffect, useState } from 'react';
import { Typography, Card, CardContent } from '@mui/material';
import MQTTCore from '../core/MQTTCore'; // Імпортуємо MQTTCore

const SensorComponent = (props) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Оновлюємо стан при надходженні повідомлень
    const updateState = () => {
      const currentState = MQTTCore.getState(props.stateTopic);
      setState(currentState);
    };

    // Підписуємося на всі топіки і оновлюємо стан
    updateState(); // Отримуємо початковий стан

    const intervalId = setInterval(updateState, 100); // Перевірка стану щосекунди

    return () => clearInterval(intervalId); // Чистимо інтервал при розмонтуванні
  }, [props.stateTopic]);

  return (
    <Card variant="outlined" sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Typography variant="h4">{props.label}</Typography>
        <Typography variant="h6">
          {state !== null ? state : 'Очікування даних...'}
          &nbsp;
          {props.measureUnit}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SensorComponent;
