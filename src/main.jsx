// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import { NotificationsProvider } from '@toolpad/core/useNotifications';

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
    <NotificationsProvider>
      <App />
    </NotificationsProvider>
  // </React.StrictMode>
);
