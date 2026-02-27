// src/core/wrappers/MqttClientWrapper.js
import mqtt from "mqtt";
import EventEmitter from "events";

class MqttClientWrapper extends EventEmitter {
  constructor(brokerConfig) {
    super();
    this.client = null;
    this.updateConfig(brokerConfig); // Використовуємо метод для початкового налаштування
  }

  updateConfig(brokerConfig) {
    this.config = brokerConfig;
    let fullUrl = `${brokerConfig.secure ? "wss" : "ws"}://${brokerConfig.host}:${brokerConfig.port}`;
    if (brokerConfig.basepath && brokerConfig.basepath.length > 0) {
      let cleanedBasepath = brokerConfig.basepath.startsWith("/")
        ? brokerConfig.basepath
        : `/${brokerConfig.basepath}`;
      if (cleanedBasepath.endsWith("/")) {
        cleanedBasepath = cleanedBasepath.slice(0, -1);
      }
      fullUrl += cleanedBasepath;
    }
    this.mqttUrl = fullUrl;

    this.options = {
      username: brokerConfig.username,
      password: brokerConfig.password,
      reconnectPeriod: 2000, // Починаємо з 2 секунд (замість 1000)
      keepalive: 15,
      connectTimeout: 5000, // даємо трохи більше часу на підключення
      clean: true,
      resubscribe: true,
      clientId: `edwic-${Math.random().toString(16).substr(2, 8)}`,
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      if (this.client && this.client.connected) {
        console.log(
          `[MQTT] Already connected to ${this.config.host} (ID: ${this.config.id})`
        );
        return resolve();
      }
      if (this.client) {
        // Якщо клієнт існує, але не підключений, просто чекаємо на його спробу перепідключення
        console.log(
          `[MQTT] Client for ${this.config.id} exists but is not connected. Awaiting reconnect.`
        );
        return resolve();
      }

      console.log(
        `[MQTT] Connecting to ${this.mqttUrl} (ID: ${this.config.id})...`
      );
      this.client = mqtt.connect(this.mqttUrl, this.options);

      // ВИПРАВЛЕННЯ: Дозволяємо Promise завершитись одразу, щоб не блокувати цикл ConnectionManager.
      // Реальний статус接続u ми відстежуємо через події EventBus.
      resolve();

      this.client.on("connect", () => {
        console.log(
          `[MQTT] Successfully connected to ${this.config.host} (ID: ${this.config.id})`
        );
        // Скидаємо таймер перепідключення після успішного з'єднання
        if (this.client && this.client.options) {
          this.client.options.reconnectPeriod = 2000;
        }
        this.emit("connect", this.config.id);
      });

      this.client.on("error", (error) => {
        console.error(
          `[MQTT] Error for ${this.config.id} (${this.config.host}):`,
          error.message
        );
        
        // Exponential Backoff: Limit max backoff to 5 seconds instead of 60 to ensure we attempt fast reconnections
        if (this.client && this.client.options && typeof this.client.options.reconnectPeriod === 'number') {
          const currentPeriod = this.client.options.reconnectPeriod;
          if (currentPeriod < 5000) {
            this.client.options.reconnectPeriod = Math.min(5000, currentPeriod * 1.5);
            console.warn(`[MQTT] Increasing reconnect delay for ${this.config.id} to ${Math.round(this.client.options.reconnectPeriod)}ms`);
          }
        }

        this.emit("error", this.config.id, error);
      });

      this.client.on("close", () => {
        console.log(
          `[MQTT] Disconnected from ${this.config.host} (ID: ${this.config.id})`
        );
        if (this.client && this.client.options) {
             this.client.options.reconnectPeriod = 2000; // Force aggressive reconnect when closed unexpectedly
        }
        this.emit("disconnect", this.config.id);
      });

      this.client.on("offline", () => {
        console.warn(`[MQTT] Client went offline for ${this.config.id}`);
        if (this.client && this.client.options) {
             this.client.options.reconnectPeriod = 2000; // Force aggressive reconnect when offline
        }
        // Емітимо фіктивну помилку, бо mqtt може не кидати подію 'error' при втраті мережі
        this.emit("error", this.config.id, { message: "Брокер недоступний (Offline)" });
      });

      this.client.on("message", (topic, message) => {
        this.emit("message", this.config.id, topic, message);
      });
    });
  }

  async disconnect() {
    return new Promise((resolve) => {
      if (this.client) {
        // Видаляємо всі слухачі, щоб уникнути витоків пам'яті
        this.client.removeAllListeners();
        this.client.end(true, () => {
          // true - примусово закрити
          console.log(
            `[MQTT] Client for ${this.config.id} (${this.config.host}) forcefully ended.`
          );
          this.client = null;
          this.emit("disconnect", this.config.id);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // --- НОВИЙ МЕТОД ДЛЯ ОНОВЛЕННЯ КОНФІГУРАЦІЇ ---
  async reconnect(newConfig) {
    console.log(
      `[MQTT] Reconnecting client ${this.config.id} with new config.`
    );
    await this.disconnect(); // Спочатку відключаємо старий клієнт
    this.updateConfig(newConfig); // Оновлюємо конфігурацію
    await this.connect(); // Підключаємось з новою конфігурацією
  }

  subscribe(topic) {
    if (this.client && this.client.connected) {
      this.client.subscribe(topic, (err) => {
        if (err)
          console.error(
            `[MQTT] Error subscribing to ${topic} for ${this.config.id}:`,
            err.message
          );
      });
    }
  }

  unsubscribe(topic) {
    if (this.client && this.client.connected) {
      this.client.unsubscribe(topic, (err) => {
        if (err)
          console.error(
            `[MQTT] Error unsubscribing from ${topic} for ${this.config.id}:`,
            err.message
          );
      });
    }
  }

  publish(topic, message) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, message, (err) => {
        if (err)
          console.error(
            `[MQTT] Error publishing to ${topic} for ${this.config.id}:`,
            err.message
          );
      });
    }
  }

  isConnected() {
    return this.client?.connected || false;
  }
}

export default MqttClientWrapper;
