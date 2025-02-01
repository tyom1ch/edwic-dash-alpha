import MQTTService from "../services/MQTTService";

class MQTTCore {
  constructor() {
    this.topics = {}; // Зберігає топіки у вигляді дерева JSON
    this.subscribers = {}; // Зберігає підписників для топіків
    this.reconnectInterval = 5000; // Інтервал для повторного підключення (5 секунд)
    this.maxReconnectAttempts = 10; // Максимальна кількість спроб перепідключення
    this.reconnectAttempts = 0; // Лічильник спроб перепідключення
  }

  // Підключення до брокера
  async connect(host, username, password) {
    try {
      console.log("✅ Підключення до брокера...");
      await MQTTService.connect(host, username, password);
    } catch (error) {
      console.error("❌ Помилка підключення:", error.message);
      throw error; // Прокидуємо оригінальну помилку без створення нового Error
    }
  }
  

  // Спроба підключення до брокера з повторними спробами
  async tryConnect(host, username, password) {
    try {
      await MQTTService.connect(host, username, password);
      console.log("✅ Підключено до брокера");
      this.reconnectAttempts = 0; // Скидаємо лічильник спроб після успішного підключення
    } catch (error) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(
          `⏳ Спроба підключення не вдалася. Повторна спроба через ${this.reconnectInterval / 1000} секунд...`
        );
        this.reconnectAttempts++;
        setTimeout(
          () => this.tryConnect(host, username, password),
          this.reconnectInterval
        );
      } else {
        console.error("❌ Перевищено кількість спроб підключення");
        throw new Error("Перевищено кількість спроб підключення"); // Прокидуємо помилку наверх
      }
    }
  }

  // Відключення від брокера
  async disconnect() {
    try {
      await MQTTService.disconnect();
      console.log("✅ Відключено від брокера");
    } catch (error) {
      console.error("❌ Помилка відключення:", error.message);
    }
  }

  // Підписка на певний топік і отримання даних
  async subscribe(topic, callback) {
    if (!this.subscribers[topic]) {
      this.subscribers[topic] = [];
      try {
        // Підписка на топік через MQTTService для отримання повідомлень
        await MQTTService.subscribe(topic, this.handleMessage.bind(this));
      } catch (error) {
        console.error("❌ Помилка підписки на топік:", error.message);
      }
    }

    // Додаємо колбек до списку підписників
    this.subscribers[topic].push(callback);
  }

  // Відписка від оновлення певного топіка
  unsubscribe(topic, callback) {
    if (this.subscribers[topic]) {
      this.subscribers[topic] = this.subscribers[topic].filter(
        (cb) => cb !== callback
      );
    }
  }

  // Сповіщення підписників про оновлення
  notifySubscribers(topic) {
    const message = this.getState(topic);
    if (this.subscribers[topic]) {
      this.subscribers[topic].forEach((callback) => callback(message));
    }
  }

  // Оновлення структури топіків
  updateTopicStructure(topic, message) {
    const parts = topic.split("/");
    let currentLevel = this.topics;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!currentLevel[part]) {
        currentLevel[part] = i === parts.length - 1 ? message : {};
      } else if (i === parts.length - 1) {
        currentLevel[part] = message;
      }
      currentLevel = currentLevel[part];
    }
  }

  // Обробка вхідних повідомлень
  handleMessage(topic, message) {
    this.updateTopicStructure(topic, message);
    this.notifySubscribers(topic);
  }

  // Отримання стану певного топіка
  getState(topic) {
    const parts = topic.split("/");
    let currentLevel = this.topics;

    for (const part of parts) {
      if (!currentLevel[part]) {
        return null;
      }
      currentLevel = currentLevel[part];
    }

    return currentLevel;
  }

  // Надсилання повідомлення в топік
  async sendMessage(topic, message) {
    try {
      await MQTTService.publish(topic, message);
    } catch (error) {
      console.error(
        `❌ Помилка відправки повідомлення в топік ${topic}:`,
        error.message
      );
    }
  }

  // Перевірка підключення
  isConnected() {
    return MQTTService.isConnected; // Метод для перевірки статусу підключення в MQTTService
  }
}

export default new MQTTCore();
