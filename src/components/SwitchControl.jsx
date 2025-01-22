import React, { useEffect, useState } from "react";
import {
  Switch,
  FormControlLabel,
  Typography,
  Card,
  CardContent,
  Box,
} from "@mui/material";
import MQTTCore from "../core/MQTTCore";

const SwitchControl = ({ stateTopic, commandTopic, label }) => {
  const [state, setState] = useState(null); // Локальний стан
  const [loading, setLoading] = useState(true); // Стан завантаження

  useEffect(() => {
    const handleUpdate = (newState) => {
      setState(newState); // Оновлюємо стан при зміні топіка
      setLoading(false); // Завершуємо завантаження, коли отримано дані
    };

    // Підписуємося на оновлення для вказаного топіка
    MQTTCore.subscribe(stateTopic, handleUpdate);

    // Ініціалізуємо початковий стан
    const initialState = MQTTCore.getState(stateTopic);
    if (initialState !== null) {
      setState(initialState);
      setLoading(false); // Дані отримані, припиняємо завантаження
    }

    // Очищення підписки при демонтунгу
    return () => {
      MQTTCore.unsubscribe(stateTopic, handleUpdate);
    };
  }, [stateTopic]);

  const handleToggle = (event) => {
    const newState = event.target.checked ? "ON" : "OFF";
    MQTTCore.sendMessage(commandTopic, newState); // Відправляємо команду через ядро
  };

  return (
    <Box sx={{ width: { xs: '1', sm: 'auto', md: 'auto' } }} marginTop={1}>
    <Card variant="outlined" sx={{ minWidth: 275, height: 100, mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{label}</Typography>
        {loading ? (
          <Typography color="textSecondary">Завантаження...</Typography>
        ) : (
          <FormControlLabel
            control={
              <Switch
                checked={state === "ON"} // Встановлюємо стан кнопки
                onChange={handleToggle}
                color="primary"
                disabled={state === null} // Вимикаємо кнопку, якщо немає даних
              />
            }
            label={state === "ON" ? "ВКЛ." : "ВИКЛ."}
          />
        )}
      </CardContent>
    </Card>
    </Box>
  );
};

export default SwitchControl;
