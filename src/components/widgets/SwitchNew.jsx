import React, { useEffect, useState } from "react";
import MQTTCore from "../core/MQTTCore";
import "../customStyles/LightingControl.css"; // Винесений CSS

const SwitchNew = ({ stateTopic, commandTopic, label }) => {
  const [state, setState] = useState(null); // Локальний стан
  const [isConnected, setIsConnected] = useState(false); // Стан підключення

  useEffect(() => {
    // Перевірка підключення до MQTT
    setIsConnected(!!MQTTCore);

    // Функція оновлення стану
    const updateState = () => {
      const currentState = MQTTCore.getState(stateTopic); // Отримуємо стан через MQTTCore
      setState(currentState);
    };

    // Оновлення стану при завантаженні
    updateState();

    // Інтервал для періодичного оновлення стану
    const interval = setInterval(updateState, 1000);

    return () => clearInterval(interval); // Очищення інтервалу
  }, [stateTopic]);

  const handleToggle = () => {
    const newState = state === "ON" ? "OFF" : "ON"; // Інверсія стану
    MQTTCore.sendMessage(commandTopic, newState); // Відправляємо новий стан
  };

  return (
    <div className="card">
      <div
        className={`toggle-switch ${state === "ON" ? "active" : ""}`}
        onClick={handleToggle}
        disabled={!isConnected} // Вимикаємо кнопку, якщо немає з'єднання
      ></div>
      <div className="icon"></div>
      <p>Light</p>
      <h3>{label}</h3>
      <p>
        {isConnected
          ? `Updated: ${state === "ON" ? "ВКЛ." : "ВИКЛ."}`
          : "Немає з'єднання"}
      </p>
    </div>
  );
};

export default SwitchNew;
