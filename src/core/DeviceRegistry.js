// src/core/DeviceRegistry.js
import eventBus from "./EventBus";
import connectionManager from "./ConnectionManager";
import { getWidgetById } from "./widgetRegistry";

// Функція для перетворення MQTT-шаблону в регулярний вираз
const mqttTopicToRegex = (topic) => {
  const regexString = topic
    .replace(/\+/g, "[^/]+") // Замінюємо '+' на будь-які символи, крім слеша
    .replace(/#/g, ".*"); // Замінюємо '#' на будь-яку послідовність символів
  return new RegExp(`^${regexString}$`);
};

class DeviceRegistry {
  constructor() {
    this.entities = new Map();
    // Тепер ключ - це шаблон топіка (може містити wildcards)
    this.topicPatternToActionMap = new Map();
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
    const newTopicPatternToActionMap = new Map();

    allComponents.forEach((component) => {
      const existingEntity = this.entities.get(component.id) || {};
      newEntities.set(component.id, { ...existingEntity, ...component });

      const widgetDef = getWidgetById(component.type);
      if (widgetDef?.getTopicMappings) {
        const topicMappings = widgetDef.getTopicMappings(component);
        for (const property in topicMappings) {
          const topicPattern = topicMappings[property];
          if (topicPattern && component.brokerId) {
            if (!newTopicPatternToActionMap.has(topicPattern)) {
              newTopicPatternToActionMap.set(topicPattern, []);
            }
            newTopicPatternToActionMap.get(topicPattern).push({
              entityId: component.id,
              property,
              brokerId: component.brokerId,
            });
          }
        }
      }
    });

    const oldPatterns = new Set(this.topicPatternToActionMap.keys());
    const newPatterns = new Set(newTopicPatternToActionMap.keys());

    const patternsToUnsubscribe = [...oldPatterns].filter(p => !newPatterns.has(p));
    const patternsToSubscribe = [...newPatterns].filter(p => !oldPatterns.has(p));

    // Припускаємо, що всі підписки йдуть на один брокер для простоти.
    // У складнішій системі тут потрібно групувати по brokerId.
    const brokerId = appConfig.brokers?.[0]?.id;
    if (brokerId) {
        patternsToUnsubscribe.forEach(pattern => connectionManager.unsubscribeFromTopic(brokerId, pattern));
        patternsToSubscribe.forEach(pattern => connectionManager.subscribeToTopic(brokerId, pattern));
    }

    this.entities = newEntities;
    this.topicPatternToActionMap = newTopicPatternToActionMap;
    console.log(`[DeviceRegistry] Sync completed. Entities: ${this.entities.size}, watching patterns: ${this.topicPatternToActionMap.size}`);
  }

  handleBrokerConnected(brokerId) {
    console.log(`[DeviceRegistry] Broker "${brokerId}" connected. Re-subscribing...`);
    this.topicPatternToActionMap.forEach((actions, pattern) => {
      if (actions.some(action => action.brokerId === brokerId)) {
        connectionManager.subscribeToTopic(brokerId, pattern);
      }
    });
  }

  handleMqttRawMessage(brokerId, topic, messageBuffer) {
    const messageString = messageBuffer.toString();

    // Ітеруємо по всіх збережених шаблонах і шукаємо відповідності
    this.topicPatternToActionMap.forEach((actions, pattern) => {
      const regex = mqttTopicToRegex(pattern);
      if (regex.test(topic)) {
        actions.forEach(action => {
          if (action.brokerId !== brokerId) return;

          const { entityId, property } = action;
          const entity = this.entities.get(entityId);

          if (entity) {
            const jsonProperties = ["attributes", "json_state"];
            let newValue;

            if (jsonProperties.includes(property)) {
              try {
                newValue = messageString ? JSON.parse(messageString) : null;
              } catch (e) {
                console.warn(`[DeviceRegistry] Failed to parse JSON for property '${property}' of ${entityId}:`, messageString);
                newValue = messageString;
              }
            } else {
              newValue = messageString;
            }
            
            const updatedEntity = {
              ...entity,
              [property]: newValue,
              last_updated: new Date().toISOString(),
            };

            this.entities.set(entityId, updatedEntity);
            eventBus.emit("entity:update", updatedEntity);
          }
        });
      }
    });
  }

  getEntity(entityId) {
    return this.entities.get(entityId);
  }
}

export default new DeviceRegistry();