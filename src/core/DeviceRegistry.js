// src/core/DeviceRegistry.js
import eventBus from "./EventBus";
import connectionManager from "./ConnectionManager";
import { getWidgetByType } from "./widgetRegistry"; // Імпортуємо наш реєстр

class DeviceRegistry {
  constructor() {
    this.entities = new Map();
    this.topicToEntityActionMap = new Map();
    this.setupListeners();
    console.log("[DeviceRegistry] Initialized.");
  }

  setupListeners() {
    eventBus.on("mqtt:raw_message", this.handleMqttRawMessage.bind(this));
    eventBus.on("broker:connected", this.handleBrokerConnected.bind(this));
  }

  syncFromAppConfig(appConfig) {
    console.log("[DeviceRegistry] Syncing with new application config...");
    const allComponents = (appConfig?.dashboards) 
      ? Object.values(appConfig.dashboards).flatMap(d => d.components || []) 
      : [];

    const newEntities = new Map();
    const newTopicActionMap = new Map();
    const topicsInNewConfig = new Set();

    allComponents.forEach((component) => {
      const existingEntity = this.entities.get(component.id) || {};
      // Створюємо нову сутність, зберігаючи її попередній стан
      newEntities.set(component.id, { ...existingEntity, ...component });

      const widgetDef = getWidgetByType(component.type);
      // Якщо віджет має опис топіків стану...
      if (widgetDef?.getTopicMappings) {
        // ...отримуємо цей опис...
        const topicMappings = widgetDef.getTopicMappings(component);
        // ...і реєструємо кожен топік, який потрібно слухати.
        for (const property in topicMappings) {
          const topic = topicMappings[property];
          if (topic && component.brokerId) {
            newTopicActionMap.set(topic, { entityId: component.id, property });
            topicsInNewConfig.add(JSON.stringify({ brokerId: component.brokerId, topic }));
          }
        }
      }
    });

    // Визначаємо, від яких топіків потрібно відписатися (ефективний спосіб)
    const topicsInOldConfig = new Set();
    for (const topic of this.topicToEntityActionMap.keys()) {
        const action = this.topicToEntityActionMap.get(topic);
        const entity = this.entities.get(action.entityId);
        if (entity && entity.brokerId) {
            topicsInOldConfig.add(JSON.stringify({ brokerId: entity.brokerId, topic }));
        }
    }

    const topicsToUnsubscribe = [...topicsInOldConfig].filter(t => !topicsInNewConfig.has(t));
    const topicsToSubscribe = [...topicsInNewConfig].filter(t => !topicsInOldConfig.has(t));

    topicsToUnsubscribe.forEach(tString => {
      const { brokerId, topic } = JSON.parse(tString);
      connectionManager.unsubscribeFromTopic(brokerId, topic);
    });
    topicsToSubscribe.forEach(tString => {
      const { brokerId, topic } = JSON.parse(tString);
      connectionManager.subscribeToTopic(brokerId, topic);
    });

    this.entities = newEntities;
    this.topicToEntityActionMap = newTopicActionMap;
    console.log(`[DeviceRegistry] Sync completed. Entities: ${this.entities.size}, watching topics: ${this.topicToEntityActionMap.size}`);
  }

  handleBrokerConnected(brokerId) {
    console.log(`[DeviceRegistry] Broker "${brokerId}" connected. Re-subscribing...`);
    for (const [topic, action] of this.topicToEntityActionMap.entries()) {
      const entity = this.entities.get(action.entityId);
      if (entity && entity.brokerId === brokerId) {
        connectionManager.subscribeToTopic(brokerId, topic);
      }
    }
  }
  
  handleMqttRawMessage(brokerId, topic, messageBuffer) {
    const action = this.topicToEntityActionMap.get(topic);
    if (action) {
      const { entityId, property } = action;
      const entity = this.entities.get(entityId);
      if (entity) {
        entity[property] = messageBuffer.toString();
        entity.last_updated = new Date().toISOString();
        eventBus.emit("entity:update", { ...entity });
      }
    }
  }

  getEntity(entityId) {
    return this.entities.get(entityId);
  }
}

export default new DeviceRegistry();