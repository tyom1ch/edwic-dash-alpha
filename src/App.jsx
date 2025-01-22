import React, { useEffect, useState } from "react";
import MQTTCore from "./core/MQTTCore";
import useLocalStorage from "./hooks/useLocalStorage"; // Імпортуємо хук
import Dashboard from "./Dashboard/MainDashboard";
import ModalSettings from "./modal/ModalSettings";
import LoadingSpinner from "./components/LoadingSpinner";
import SettingsButton from "./components/SettingsButton";
import { StyledEngineProvider } from "@mui/material";
import useSimpleRouter from "./hooks/useSimpleRouter";

const App = () => {
  // Використовуємо useLocalStorage для зберігання налаштувань підключення
  const [connectionSettings, setConnectionSettings] = useLocalStorage(
    "mqttConnectionSettings",
    {
      host: "",
      username: "",
      password: "",
    }
  );
  // const [connectionSettings, setConnectionSettings] = useLocalStorage('mqttConnectionSettings', {
  //   host: '91.222.155.146',
  //   username: 'glados',
  //   password: 'glados',
  // });

  const [connectionStatus, setConnectionStatus] = useState(false);
  const [loading, setLoading] = useState(true); // Статус завантаження
  const [openModal, setOpenModal] = useState(false); // Статус модального вікна

  // Підключення до брокера при завантаженні
  useEffect(() => {
    if (loading) {
      MQTTCore.connect(
        "ws://" + connectionSettings.host,
        connectionSettings.username,
        connectionSettings.password
      )
        .then(() => {
          // MQTTCore.subscribeToAllTopics();
          setConnectionStatus(true);
          setLoading(false); // Встановлюємо статус завантаження в false
        })
        .catch((error) => {
          console.error("Помилка підключення:", error);
          setConnectionStatus(false);
          setLoading(false); // Встановлюємо статус завантаження в false
        });
    }
  }, [loading, connectionSettings]);

  // Функція для відкриття і закриття модального вікна
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  // Функція для збереження налаштувань з модального вікна
  const handleSaveSettings = () => {
    setLoading(true); // Починаємо процес підключення
    setOpenModal(false); // Закриваємо модальне вікно
  };

  const router = useSimpleRouter("/home");

  return (
    <StyledEngineProvider>
      {loading && <LoadingSpinner />} {/* Кільце завантаження */}
      <SettingsButton onClick={handleOpenModal} /> {/* Кнопка налаштувань */}
      <ModalSettings
        open={openModal}
        onClose={handleCloseModal}
        connectionSettings={connectionSettings}
        setConnectionSettings={setConnectionSettings}
        onSave={handleSaveSettings}
      />{" "}
      {/* Модальне вікно для налаштувань */}
      {/* Якщо підключення успішне, рендеримо Dashboard */}
      {connectionStatus && <Dashboard router={router}/>}
    </StyledEngineProvider>
  );
};

export default App;
