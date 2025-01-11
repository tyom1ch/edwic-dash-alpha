import { useState, useEffect } from 'react';
import MQTTCore from '../core/MQTTCore';

const useMQTT = (stateTopic = null, commandTopic = null) => {
  const [state, setState] = useState(null);
  const [topics, setTopics] = useState({});

  useEffect(() => {
    const handleStateUpdate = () => {
      if (stateTopic) {
        const newState = MQTTCore.getState(stateTopic);
        setState(newState);
      }
      setTopics({ ...MQTTCore.topics }); // Оновлюємо структуру топіків
    };

    // Викликаємо оновлення при першому рендері
    handleStateUpdate();

    // Підписуємося на зміни структури (можемо додати listener для MQTTCore, якщо потрібний real-time)
    const intervalId = setInterval(handleStateUpdate, 500); // Оновлюємо кожні 500 мс

    return () => clearInterval(intervalId); // Прибираємо інтервал при розмонтуванні
  }, [stateTopic]);

  const sendMessage = (newState) => {
    if (commandTopic) {
      MQTTCore.sendMessage(commandTopic, newState);
    } else {
      console.error('❌ commandTopic не вказаний для useMQTT');
    }
  };

  return { state, topics, sendMessage };
};

export default useMQTT;
