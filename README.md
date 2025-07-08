# Edwic.Dash

![image](https://github.com/user-attachments/assets/cc4f998c-a5bb-49e9-a80c-bbe3e20a9859)

<!-- CHANGELOG START -->
## v0.0.4

UI зміни, краща сумісність
✨ **Нові можливості**
- Додано підтримку перетягування елементів інтерфейсу.

♻️ **Зміни**
- Оновлено логіку визначення режиму роботи віджета клімату на основі наявності полів конфігурації.
- Змінено структуру та зовнішній вигляд віджета SensorComponent для адаптивного масштабування тексту.
- Тепер використовуються `value_template` з конфігурації компонента, якщо `val_tpl` відсутній в entity.
- Уніфіковано віджети клімату (тепер один віджет обробляє різні конфігурації).

🐛 **Виправлення**
- Виправлено обробку режимів у ClimateComponent, враховуючи рядки та масиви.
- Виправлено логіку отримання deviceId в DiscoveryService.
- Виправлено помилку, коли ініціалізація Core Services відбувалася декілька разів.
- В discovery dialog зупинена навігація при кліку на іконку

🧹 **Внутрішні зміни**
- Оновлено залежності.
- Замінено StyledEngineProvider на ThemeProvider.
- Додано та налаштовано `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- Видалено компонент ModalDashSettings.
- Покращено обробку стану підключення до брокерів MQTT та відображення сповіщень.
- Додано обробку помилок та повідомлень.
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
