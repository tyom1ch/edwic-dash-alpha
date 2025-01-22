import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Підключення до брокера під час завантаження сторінки
// MQTTCore.connect('ws://91.222.155.146', 'glados', 'glados');
// MQTTCore.subscribeToAllTopics(); // Підписка на всі повідомлення

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
