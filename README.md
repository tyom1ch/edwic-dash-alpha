# Edwic.Dash

![image](https://github.com/user-attachments/assets/cc4f998c-a5bb-49e9-a80c-bbe3e20a9859)

---

## ⚡ One-liner для запуску (Docker)

```bash
curl -fsSL https://raw.githubusercontent.com/tyom1ch/edwic-dash-alpha/main/install.sh -o install.sh && bash install.sh
```

---

## 🐍 Альтернатива: запуск з `gh-pages` на Python (мінімально)

```bash
git clone --depth=1 --branch gh-pages https://github.com/tyom1ch/edwic-dash-alpha.git edwic-dash-ghpages && \
cd edwic-dash-ghpages && python3 -m http.server 4173
```

> ⚠️ Потрібен встановлений **Python 3**

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

* Зупинити Python-сервер:

  > натисни `Ctrl+C` в терміналі

---
