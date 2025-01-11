import React, { useEffect, useState } from 'react';
import { TextField, Card, CardContent, Typography, Button } from '@mui/material';
import MQTTCore from '../core/MQTTCore';

const InputBox = ({ stateTopic, commandTopic, label }) => {
  const [inputValue, setInputValue] = useState('');
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Оновлюємо стан при надходженні повідомлень
    const updateState = () => {
      const currentState = MQTTCore.getState(stateTopic);
      setState(currentState);
    };

    // Підписуємося на всі топіки і оновлюємо стан
    updateState(); // Отримуємо початковий стан

    const intervalId = setInterval(updateState, 100); // Перевірка стану щосекунди

    return () => clearInterval(intervalId); // Чистимо інтервал при розмонтуванні
  }, [stateTopic]);

  const handleChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = () => {
    MQTTCore.sendMessage(commandTopic, inputValue); // Відправляємо значення в топік
    setInputValue(''); // Очищуємо поле після відправки
  };

  return (
    <Card variant="outlined" sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{label}</Typography>
        <TextField
          value={inputValue}
          onChange={handleChange}
          placeholder={state}
          fullWidth
          variant="outlined"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSubmit(); // Викликаємо handleSubmit, якщо натиснуто Enter
            }
          }}
        />
      </CardContent>
    </Card>
  );
};

export default InputBox;
