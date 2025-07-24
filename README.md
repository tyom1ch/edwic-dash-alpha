[![CI - Development Build](https://github.com/tyom1ch/edwic-dash-alpha/actions/workflows/dev.yml/badge.svg)](https://github.com/tyom1ch/edwic-dash-alpha/actions/workflows/dev.yml)
[![CD - Create Release](https://github.com/tyom1ch/edwic-dash-alpha/actions/workflows/release.yml/badge.svg)](https://github.com/tyom1ch/edwic-dash-alpha/actions/workflows/release.yml)
---

# Edwic.Dash

![image](https://github.com/user-attachments/assets/a46446bc-fb66-4015-ac4e-ab2eff8802cc)

[🇬🇧 English](#english-version)
---

<a name="english-version"></a>
## 🇬🇧 Edwic.Dash: Your MQTT Dashboard in the Browser

**Edwic.Dash** is a modern, fast, and beautiful dashboard for monitoring and controlling your MQTT devices. Its key feature is its **"Frontend-Only"** architecture: the entire application runs directly in your browser, with no backend required.

### 🚀 What is this for?

**Edwic.Dash** is designed as a lightweight and simple solution for visualizing and controlling MQTT devices. It's the perfect tool if you:
*   Want a fast and intuitive interface for your existing MQTT infrastructure.
*   Use devices compatible with **Home Assistant MQTT Discovery** (e.g., ESPHome, Zigbee2MQTT).
*   Don't need complex automations on the dashboard side, but rather a convenient "remote control."
*   Value autonomy, as all your configuration is stored locally in your browser.

### ✨ Key Features

*   **Frontend-Only Architecture**: No server-side backend needed. The app connects directly to your MQTT broker via WebSockets.
*   **Home Assistant MQTT Discovery Support**: Automatically discovers and adds new devices.
*   **Highly Customizable Dashboards**:
    *   Create and manage multiple independent dashboards.
    *   Use a flexible grid to drag, drop, and resize widgets.
*   **Essential Widgets**:
    *   **Sensor:** Displays data and its value history.
    *   **Switch:** Sends `ON`/`OFF` commands.
    *   **Climate:** Controls the temperature and modes of climate devices.
*   **Configuration Management**: Easily export and import your entire setup to a `.json` file.
*   **Cross-Platform**: Run it as a web app, via Docker, or as a native Android app.

### ⚙️ Getting Started

#### ⚡ One-liner for a quick start
> ⚠️ **Docker** installation is required.

```bash
curl -fsSL https://raw.githubusercontent.com/tyom1ch/edwic-dash-alpha/main/install.sh -o install.sh && bash install.sh
```

#### 🚀 Accessing in Browser
Open `http://localhost:4173` in your browser.

To access from another device on your network, use the IP address of the machine running Docker:
`http://<host_IP_address>:4173`

#### 🛠️ Useful Docker Commands
*   Stop and remove the container:
    ```bash
    docker stop edwic-dash && docker rm edwic-dash
    ```
*   Restart the container:
    ```bash
    docker restart edwic-dash
    ```

### 🛠️ For Developers: The Tech Stack

*   **Framework:** [React](https://reactjs.org/) (with Vite)
*   **Language:** [Javascript](https://www.javascript.com/)
*   **UI Components:** [Material-UI (MUI)](https://mui.com/)
*   **MQTT Client:** [MQTT.js](https://github.com/mqttjs/MQTT.js)
*   **Dashboard Grid:** [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)
*   **Mobile Build:** [Capacitor](https://capacitorjs.com/)

### 🔮 Roadmap

*   **Notification System**: Receive alerts for important events.
*   **More Widgets**: Adding support for ~lights, fans, covers,~ and other entities.
*   **Enhanced UI/UX**: Continuously improving the user interface and overall experience.
