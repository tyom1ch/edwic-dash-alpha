# Edwic.Dash

![image](https://github.com/user-attachments/assets/cc4f998c-a5bb-49e9-a80c-bbe3e20a9859)

<!-- CHANGELOG START -->
## v0.0.3

✨ **Нові можливості**
- Додано обробку шаблонів значень для сенсорів (`val_tpl`). Тепер можна використовувати шаблони Jinja для форматування значень, що відображаються.
- Додано новий файл `templateEvaluator.js` для обробки шаблонів значень.
- Додано підтримку `unit_of_meas` з конфігурації віджета, якщо він відсутній у даних сутності.
♻️ **Зміни**
- Перейменовано `fields` на `topicFields` у конфігурації віджетів.
- Перейменовано `state_topic` на `stat_t` у конфігурації віджетів.
- Оновлено `SensorComponent.jsx` для використання `templateEvaluator.js` та відображення обробленого значення сенсора.
- Оновлено `DiscoveryDialog.jsx` для логування конфігурації сутності.
- Змінено логіку в `ModalDashSettings.jsx`: текст пункту меню "Lock edit" та "Unlock edit" змінився місцями.
- Змінено назву полів з `command_topic` на `cmd_t`, `payload_on` на `pl_on` та `payload_off` на `pl_off` у віджеті Switch.
- Використання `name` замість `label` в `SensorComponent.jsx`.
🐛 **Виправлення**
- Виправлено помилку, через яку в режимі редагування панелі відображався невірний текст для блокування/розблокування редагування.
🧹 **Внутрішні зміни**
- Оновлено конфігурацію GitHub Actions для коректної роботи бота.
- Оновлено залежності.
- Видалено зайвий коментар у `vite.config.js`.
- Оновлено логіку бота для генерації README.
- Змінено назву пакету з `genai` на `generativeai` в GitHub Actions.
- Виправлено помилку імпорту в GitHub Actions.
- Додано конфігурацію гілки для GitHub Actions.
- Оновлено повідомлення коміту в GitHub Actions.
- Додано перевірку на наявність змін перед комітом в GitHub Actions.
- Додано логіку обробки помилок в `templateEvaluator.js`.
- Виправлено назву хука pre-commit в README.
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
