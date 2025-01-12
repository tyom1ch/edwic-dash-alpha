import MQTTService from '../services/MQTTService';

class MQTTCore {
  constructor() {
    this.topics = {}; // Зберігає топіки у вигляді дерева JSON
    this.subscribers = {}; // Зберігає підписників для топіків
  }

  // Підключення до брокера
  async connect(host, username, password) {
    try {
      await MQTTService.connect(host, username, password);
    } catch (error) {
      throw error;
    }
  }

  // Відключення від брокера
  disconnect() {
    try {
      MQTTService.disconnect();
      console.log('✅ Відключено від брокера');
    } catch (error) {
      console.error('❌ Помилка відключення:', error.message);
    }
  }

  // Підписка на всі топіки
  subscribeToAllTopics() {
    try {
      MQTTService.subscribe('#', this.handleMessage.bind(this));
    } catch (error) {
      console.error('❌ Помилка підписки:', error.message);
    }
  }

  // Підписка на оновлення певного топіка
  subscribe(topic, callback) {
    if (!this.subscribers[topic]) {
      this.subscribers[topic] = [];
    }
    this.subscribers[topic].push(callback);
  }

  // Відписка від оновлення певного топіка
  unsubscribe(topic, callback) {
    if (this.subscribers[topic]) {
      this.subscribers[topic] = this.subscribers[topic].filter(cb => cb !== callback);
    }
  }

  // Сповіщення підписників про оновлення
  notifySubscribers(topic, message) {
    if (this.subscribers[topic]) {
      this.subscribers[topic].forEach(callback => callback(message));
    }
  }

  // Обробка вхідних повідомлень
  handleMessage(topic, message) {
    this.updateTopicStructure(topic, message);

    // Сповіщаємо підписників
    this.notifySubscribers(topic, message);
  }

  // Оновлення структури топіків
  updateTopicStructure(topic, message) {
    const parts = topic.split('/');
    let currentLevel = this.topics;

    parts.forEach((part, index) => {
      if (!currentLevel[part]) {
        currentLevel[part] = {}; // Ініціалізуємо, якщо рівень не існує
      }
      if (index === parts.length - 1) {
        currentLevel[part] = message; // Зберігаємо значення на кінцевому рівні
        this.notifySubscribers(topic, message); // Сповіщаємо зміни на конкретному рівні
      }
      currentLevel = currentLevel[part];
    });
  }

  // Отримання стану певного топіка
  getState(topic) {
    const parts = topic.split('/');
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
  sendMessage(topic, message) {
    try {
      MQTTService.publish(topic, message);
    } catch (error) {
      console.error(`❌ Помилка відправки повідомлення в топік ${topic}:`, error.message);
    }
  }
}

export default new MQTTCore();
