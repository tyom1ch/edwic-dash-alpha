// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { NotificationsProvider } from '@toolpad/core/useNotifications';
import { LanguageProvider } from './i18n/LanguageProvider';

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
    <LanguageProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </LanguageProvider>
  // </React.StrictMode>
);
