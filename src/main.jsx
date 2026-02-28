// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { NotificationsProvider } from '@toolpad/core/useNotifications';
import { AppConfigProvider } from './context/AppConfigContext.jsx';

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
    <NotificationsProvider>
      <AppConfigProvider>
        <App />
      </AppConfigProvider>
    </NotificationsProvider>
  // </React.StrictMode>
);
