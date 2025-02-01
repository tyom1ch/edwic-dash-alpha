import MQTTService from "../services/MQTTService";

class EntityManager {
  constructor() {
    this.entities = [];
    this.subscribers = {};
    this.globalSubscribers = []; // Для підписників, що слухають всі сутності
  }

  async initializeEntities(mainTopic) {
    const wildcardTopic = `${mainTopic}#`;
    await MQTTService.subscribe(wildcardTopic, this.handleMessage.bind(this));
  }

  handleMessage(topic, message) {
    try {
      const parts = topic.split("/");
      if (parts.length < 3) {
        // console.warn(`⚠️ Невизначений формат топіка: ${topic}`);
        return;
      }

      const prefix = parts[0]; // Префікс сутності (наприклад, aubes-plug-5-e38549)
      const type = parts[1]; // Тип сутності (наприклад, binary_sensor)
      const name = parts.slice(2, -1).join("/"); // Ідентифікатор сутності (наприклад, button)
      const suffix = parts[parts.length - 1]; // Суфікс (state/command)

      // Ігноруємо повідомлення, якщо суфікс не 'state'
      if (suffix !== "state") {
        return;
      }

      const id = `${prefix}:${type}/${name}`; // Унікальний ідентифікатор сутності
      let entity = this.entities.find((e) => e.id === id);

      // Якщо сутність не знайдено, створюємо нову
      if (!entity) {
        entity = {
          id,
          type, // Тип сутності (наприклад, binary_sensor)
          label: `${prefix}/${type}/${name}`,
          state: null,
          stateTopic: null,
          commandTopic: null,
        };
        this.entities.push(entity);
      }

      // Оновлюємо стан сутності
      entity.state = message;
      entity.stateTopic = topic;

      // Генерація commandTopic, якщо тип сутності не sensor
      if (type !== "sensor" && !entity.commandTopic) {
        entity.commandTopic = topic.replace("/state", "/command");
      }

      this.notifySubscribers(id, message); // Сповіщення підписників
      this.notifyGlobalSubscribers(); // Сповіщення всіх глобальних підписників
    } catch (error) {
      console.error(
        `❌ Помилка обробки повідомлення: ${topic} => ${message}`,
        error
      );
    }
  }

  subscribeToEntity(id, callback) {
    if (!this.subscribers[id]) this.subscribers[id] = [];
    this.subscribers[id].push(callback);

    const entity = this.entities.find((e) => e.id === id);
    if (entity && entity.state !== null) callback(entity.state);
  }

  unsubscribeFromEntity(id, callback) {
    if (this.subscribers[id]) {
      this.subscribers[id] = this.subscribers[id].filter(
        (cb) => cb !== callback
      );
    }
  }

  subscribeToAllEntities(callback) {
    this.globalSubscribers.push(callback);
    callback(this.entities); // Надсилаємо початковий стан
  }

  unsubscribeFromAllEntities(callback) {
    this.globalSubscribers = this.globalSubscribers.filter(
      (cb) => cb !== callback
    );
  }

  notifySubscribers(id, message) {
    if (this.subscribers[id]) {
      this.subscribers[id].forEach((callback) => callback(message));
    }
  }

  notifyGlobalSubscribers() {
    this.globalSubscribers.forEach((callback) => callback(this.entities));
  }

  getEntities() {
    return this.entities;
  }

  clearEntities() {
    this.entities = [];
  }
}

export default new EntityManager();
