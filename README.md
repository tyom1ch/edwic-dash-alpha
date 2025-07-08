# Edwic.Dash

![image](https://github.com/user-attachments/assets/cc4f998c-a5bb-49e9-a80c-bbe3e20a9859)

<!-- CHANGELOG START -->
## v0.0.4b

Переміщення віджета
♻️ **Зміни**
- Переміщено `WidgetWrapper` з `src/components/WidgetWrapper.jsx` в `src/components/widgets/WidgetWrapper.jsx`.

🧹 **Внутрішні зміни**
- Видалено компоненти `ModalDashSettings.jsx` та `SettingsButton.jsx`.
<!-- CHANGELOG END -->

# Запуск дашборду

---

## ⚡ One-liner для запуску

```bash
curl -fsSL https://raw.githubusercontent.com/tyom1ch/edwic-dash-alpha/main/install.sh -o install.sh && bash install.sh
```

---

> ⚠️ Потрібен встановлений **Docker**

---

## 🚀 Відкривай у браузері

```
http://localhost:4173
```

---

### 📡 Щоб зайти з іншого пристрою у мережі

```
http://<IP_машини_де_запущено>:4173
```

---

### 🛠️ Корисні команди

* Зупинити й видалити Docker-контейнер:

  ```bash
  docker stop edwic-dash && docker rm edwic-dash
  ```

* Перезапустити Docker-контейнер:

  ```bash
  docker restart edwic-dash
  ```
---
