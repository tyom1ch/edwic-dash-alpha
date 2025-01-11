import MQTTService from '../services/MQTTService';

class MQTTCore {
  constructor() {
    this.topics = {}; // Зберігає топіки у вигляді дерева JSON
  }

  // Підключення до брокера
  async connect(host, username, password) {
    try {
      await MQTTService.connect(host, username, password);
    //   console.log('✅ Підключено до брокера');
    } catch (error) {
    //   console.error('❌ Помилка підключення до брокера:', error.message);
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
    //   console.log('✅ Підписано на всі топіки (#)');
    } catch (error) {
      console.error('❌ Помилка підписки:', error.message);
    }
  }

  // Обробка вхідних повідомлень та оновлення дерева топіків
  handleMessage(topic, message) {
    // console.log(`📬 Повідомлення з топіка ${topic}: ${message}`);
    this.updateTopicStructure(topic, message);
    // console.log((this.topics));
  }

  // Оновлення структури топіків
  updateTopicStructure(topic, message) {
    // console.log(topics);
    const parts = topic.split('/');
    let currentLevel = this.topics;

    parts.forEach((part, index) => {
      if (!currentLevel[part]) {
        currentLevel[part] = {}; // Ініціалізуємо, якщо рівень не існує
      }
      if (index === parts.length - 1) {
        currentLevel[part] = message; // Зберігаємо значення на кінцевому рівні
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
        // console.warn(`⚠️ Топік "${topic}" не знайдено`);
        return null;
      }
      currentLevel = currentLevel[part];
    }

    return currentLevel; // Повертаємо знайдений стан
  }

  // Надсилання повідомлення в топік
  sendMessage(topic, message) {
    try {
      MQTTService.publish(topic, message);
      console.log(`📤 Повідомлення відправлено в топік ${topic}: ${message}`);
    } catch (error) {
      console.error(`❌ Помилка відправки повідомлення в топік ${topic}:`, error.message);
    }
  }
}

export default new MQTTCore();
