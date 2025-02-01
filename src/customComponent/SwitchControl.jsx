import React, { useEffect, useState } from "react";
import { Typography, Card, CardContent, ButtonBase } from "@mui/material";
import MQTTCore from "../core/MQTTCore";
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const hapticsImpactLight = async () => {
  await Haptics.impact({ style: ImpactStyle.Light });
};

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

    // Очищення підписки при демонтажі
    return () => {
      MQTTCore.unsubscribe(stateTopic, handleUpdate);
    };
  }, [stateTopic]);

  const handleToggle = () => {
    hapticsImpactLight();
    const newState = state === "ON" ? "OFF" : "ON";
    setState(newState); // Локальне оновлення стану для миттєвого відображення
    MQTTCore.sendMessage(commandTopic, newState); // Відправляємо команду через ядро
  };

  return (
    <Card
      variant="outlined"
      sx={{
        minWidth: 275,
        height: 100, // Оновлено на фіксовану висоту
        mb: 2,
        overflow: "hidden",
        transition: "background-color 0.3s ease", // Додаємо плавний перехід
      }}
    >
      <ButtonBase
        onClick={handleToggle}
        sx={{
          width: "100%",
          height: "100%", // Завдяки цьому картка буде заповнювати всю висоту
          display: "block",
          textAlign: "left",
        }}
      >
        <CardContent>
          <Typography color="textSecondary" variant="h6" sx={{ paddingRight: 6 }}>
            {label}
          </Typography>
          {loading ? (
            <Typography color="textSecondary">Завантаження...</Typography>
          ) : (
            <Typography color={state === "ON" ? "textPrimary" : "textSecondary"} variant="h5">{state}</Typography>
          )}
        </CardContent>
      </ButtonBase>
    </Card>
  );
};

export default SwitchControl;
