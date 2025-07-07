# Edwic.Dash

![image](https://github.com/user-attachments/assets/cc4f998c-a5bb-49e9-a80c-bbe3e20a9859)

<!-- CHANGELOG START -->
## v0.0.3

✨ **Нові можливості**
- Додано обробку шаблонів значень для сенсорів (на основі `val_tpl` з Home Assistant).

♻️ **Зміни**
- Перейменовано топіки для віджетів у `widgetRegistry.js` на більш відповідні (`stat_t`, `cmd_t`, `pl_on`, `pl_off` і т.д.).
- Налаштування "Lock edit" змінено на протилежне значення.
- Змінено структуру віджетів у `widgetRegistry.js`, щоб використовувати конфігурацію з Home Assistant.
- В `SensorComponent.jsx` тепер використовується `name` замість `label` з конфігурації.

🐛 **Виправлення**
- Виправлено визначення типу HA в `DiscoveryDialog.jsx`.
- Виправлено помилку, через яку бот не міг оновити README.md.

🧹 **Внутрішні зміни**
- Видалено зайві файли `icon.png` та `readme-release.yml`.
- Перейменовано `title` в `index.html` на "EdwIC - Dash".
- Оновлено логіку бота для генерації README.md.
- Видалено `useSimpleRouter.js`.
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
