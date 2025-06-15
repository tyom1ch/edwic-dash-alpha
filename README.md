![image](https://github.com/user-attachments/assets/1d622c80-67c9-46df-b519-6f702b483dcc)

# Edwic.Dash

**Edwic.Dash** is a modern, flexible, and fast dashboard for monitoring and controlling your IoT devices via the MQTT protocol. Built with React, it offers an intuitive interface and extensive customization options, allowing you to create the perfect control panel for your smart home, workshop, or any other IoT project.

#### Core Features:

*   **Multi-Dashboard Support**: Create multiple independent dashboards for different rooms, projects, or systems.
*   **Flexible Widget Grid**: Arrange widgets exactly how you like with a drag-and-drop grid. Positions and sizes are saved automatically.
*   **Essential Widget Set**:
    *   **Sensor**: Displays real-time data from any sensor (temperature, humidity, pressure, etc.).
    *   **Switch**: Control relays, lights, and other devices with ON/OFF commands.
*   **Persistent Connection**: A stable MQTT connection that runs in the background and doesn't disconnect when navigating between pages.
*   **Lock Mode**: Lock the dashboard layout to prevent accidental edits.
*   **Responsive Design**: Looks and works great on both desktop and mobile devices.
*   **Easy Configuration**: Manage your list of MQTT brokers and widgets through a user-friendly graphical interface.

---

### Changelog

**v1.0.0 (Initial Release)**

*   **✨ New:** Implemented a core architecture based on an event-driven model.
*   **✨ New:** Multi-dashboard support with the ability to add and remove them.
*   **✨ New:** Interactive `react-grid-layout` with automatic saving of widget positions.
*   **✨ New:** "Sensor" and "Switch" widgets.
*   **✨ New:** Modal dialog for adding and editing widgets with dynamic fields.
*   **✨ New:** MQTT broker management through the settings page.
*   **🚀 Improvement:** Stable, background MQTT connection that persists across route changes and dashboard edits.
*   **🚀 Improvement:** Widgets now instantly display the last known value on load.
*   **🐛 Fix:** Resolved numerous race conditions and `useEffect` double-invocation issues in `React.StrictMode`.

---
