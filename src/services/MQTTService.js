import mqtt from "mqtt";

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  // Підключення до брокера (асинхронне)
  async connect(host, username, password) {
    const options = { username, password };
  
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(host, options);
  
      this.client.on("connect", () => {
        this.isConnected = true;
        resolve();
      });
  
      this.client.on("error", (err) => {
        this.client.end();
        this.isConnected = false;
        reject(err); // Передаємо реальну помилку наверх
      });
  
      this.client.on("close", () => {
        this.isConnected = false;
        reject(new Error("🔌 З'єднання закрито")); // Додаємо відловлення закриття
      });
  
      this.client.on("offline", () => {
        this.isConnected = false;
        reject(new Error("🔌 Клієнт перейшов в offline-режим")); // Викидаємо помилку при offline
      });
    });
  }
  

  // Відключення від брокера
  async disconnect() {
    if (!this.client) {
      throw new Error("MQTT клієнт не підключено");
    }

    return new Promise((resolve) => {
      this.client.end(() => {
        this.isConnected = false;
        this.client = null;
        resolve();
      });
    });
  }

  // Підписка на топік (асинхронно)
  async subscribe(topic, callback) {
    console.log(`🔔 Підписка на топік: ${topic}`);
    if (!this.client) {
      throw new Error("MQTT клієнт не підключено");
    }

    try {
      await new Promise((resolve, reject) => {
        this.client.subscribe(topic, (err) => {
          if (err) {
            reject(new Error(`❌ Помилка підписки на топік: ${topic}`));
          } else {
            resolve();
          }
        });
      });

      // Прослуховування повідомлень
      this.client.on("message", (receivedTopic, message) => {
        // console.log(`📨 MQTTService отримало повідомлення: ${receivedTopic} => ${message.toString()}`);
        // Передаємо ВСІ повідомлення у callback
        callback(receivedTopic, message.toString());
      });
    } catch (error) {
      console.error(error.message);
    }
  }

  // Надсилання повідомлення (асинхронно)
  async publish(topic, message) {
    if (!this.client) {
      throw new Error("MQTT клієнт не підключено");
    }

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, (err) => {
        if (err) {
          reject(
            new Error(`❌ Помилка публікації в топік ${topic}: ${err.message}`)
          );
        } else {
          resolve();
        }
      });
    });
  }
}

export default new MQTTService();
