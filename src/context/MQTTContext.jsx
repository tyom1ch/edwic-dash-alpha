import React, { createContext, useState, useEffect } from 'react';
import MQTTService from '../services/MQTTService';

export const MQTTContext = createContext();

const MQTTProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connectMQTT = async () => {
      try {
        await MQTTService.connect('ws://91.222.155.146', 'glados', 'glados');
        setIsConnected(true);
        console.log('✅ Підключено до MQTT брокера');
      } catch (error) {
        console.error('❌ Помилка підключення до MQTT:', error.message);
      }
    };

    connectMQTT();

    return () => {
      MQTTService.disconnect();
    };
  }, []);

  return (
    <MQTTContext.Provider value={{ MQTTService, isConnected }}>
      {children}
    </MQTTContext.Provider>
  );
};

export default MQTTProvider;
