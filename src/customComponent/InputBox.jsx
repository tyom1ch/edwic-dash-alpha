import React, { useEffect, useState } from "react";
import {
  TextField,
  Card,
  CardContent,
  Typography,
  Button,
} from "@mui/material";
import MQTTCore from "../core/MQTTCore";

const InputBox = ({ stateTopic, commandTopic, label }) => {
  const [inputValue, setInputValue] = useState("");
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

  const handleChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = () => {
    MQTTCore.sendMessage(commandTopic, inputValue); // Відправляємо значення в топік
    setInputValue(""); // Очищуємо поле після відправки
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
            if (event.key === "Enter") {
              handleSubmit(); // Викликаємо handleSubmit, якщо натиснуто Enter
            }
          }}
        />
      </CardContent>
    </Card>
  );
};

export default InputBox;
