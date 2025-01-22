import React, { useEffect, useState } from "react";
import { Typography, Card, CardContent, Box } from "@mui/material";
import MQTTCore from "../core/MQTTCore"; // Імпортуємо MQTTCore

const SensorComponent = ({ stateTopic, label, measureUnit }) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    const handleUpdate = (newState) => {
      setState(newState); // Оновлюємо стан при зміні топіка
    };

    // Підписуємося на оновлення для вказаного топіка
    MQTTCore.subscribe(stateTopic, handleUpdate);

    // Ініціалізуємо початковий стан з кешу
    const initialState = MQTTCore.getState(stateTopic);
    if (initialState !== null) {
      setState(initialState);
    }

    // Очищаємо підписку при розмонтуванні компонента
    return () => {
      MQTTCore.unsubscribe(stateTopic, handleUpdate);
    };
  }, [stateTopic]);

  return (
    <Card
      variant="outlined"
      sx={{
        minWidth: 275,
        height: 100, // Встановлюємо однакову висоту
        mb: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%", // Розтягуємо на всю висоту картки
          display: "block",
          textAlign: "left",
        }}
      >
        <CardContent>
          <Typography color="textSecondary" variant="h6" sx={{ paddingRight: 6 }}>{label}</Typography>
          {!state ? (
            <Typography color="textSecondary">Завантаження...</Typography>
          ) : (
            <Typography variant="h5">{state}</Typography>
          )}
        </CardContent>
      </Box>
    </Card>
  );
};

export default SensorComponent;
