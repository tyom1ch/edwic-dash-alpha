// src/core/DeviceRegistry.js
import eventBus from "./EventBus";
import connectionManager from "./ConnectionManager";
import { getWidgetById } from "./widgetRegistry";

class DeviceRegistry {
  constructor() {
    this.entities = new Map();
    this.topicToActionMap = new Map(); 
    this.setupListeners();
    console.log("[DeviceRegistry] Initialized.");
  }

  setupListeners() {
    eventBus.on("mqtt:raw_message", this.handleMqttRawMessage.bind(this));
    eventBus.on("broker:connected", this.handleBrokerConnected.bind(this));
  }

  _getTopicsByBroker(topicMap) {
    const topicsByBroker = new Map();
    for (const [topic, actions] of topicMap.entries()) {
        for (const action of actions) {
            if (!topicsByBroker.has(action.brokerId)) {
                topicsByBroker.set(action.brokerId, new Set());
            }
            topicsByBroker.get(action.brokerId).add(topic);
        }
    }
    return topicsByBroker;
  }

  syncFromAppConfig(appConfig) {
    console.log("[DeviceRegistry] Syncing with new application config...");
    const allComponents = (appConfig?.dashboards)
      ? Object.values(appConfig.dashboards).flatMap(d => d.components || [])
      : [];

    const oldTopicsByBroker = this._getTopicsByBroker(this.topicToActionMap);

    const newEntities = new Map();
    const newTopicActionMap = new Map();

    allComponents.forEach((component) => {
      const widgetDef = getWidgetById(component.type);
      let finalComponentConfig = { ...component }; // Починаємо з конфігурації, збереженої в дашборді
      let topicMappings = {};

      if (widgetDef?.getTopicMappings) {
        // +++ ГОЛОВНИЙ ФІКС ТУТ +++
        // 1. Отримуємо згенеровану конфігурацію з нашого реєстру
        const generatedMappings = widgetDef.getTopicMappings(component);
        
        // 2. Розумно зливаємо її зі збереженою конфігурацією.
        // Це гарантує, що прапорці типу `brightness: true` будуть додані.
        finalComponentConfig = { ...generatedMappings, ...component };
        
        // 3. Для підписок використовуємо згенеровані мапінги
        topicMappings = generatedMappings;
      }
      
      // Зберігаємо фінальну, об'єднану конфігурацію
      const existingEntity = this.entities.get(component.id) || {};
      newEntities.set(component.id, { ...existingEntity, ...finalComponentConfig });

      // Логіка підписок (залишається простою і надійною)
      for (const property in topicMappings) {
        const mappingValue = topicMappings[property];
        if (typeof mappingValue === 'string') {
          const topic = mappingValue;
          if (!newTopicActionMap.has(topic)) {
            newTopicActionMap.set(topic, []);
          }
          newTopicActionMap.get(topic).push({
            entityId: component.id,
            property,
            brokerId: component.brokerId,
          });
        }
      }
    });

    const newTopicsByBroker = this._getTopicsByBroker(newTopicActionMap);
    const allBrokerIds = new Set([...oldTopicsByBroker.keys(), ...newTopicsByBroker.keys()]);

    allBrokerIds.forEach(brokerId => {
      const oldTopics = oldTopicsByBroker.get(brokerId) || new Set();
      const newTopics = newTopicsByBroker.get(brokerId) || new Set();
      const topicsToUnsubscribe = [...oldTopics].filter(t => !newTopics.has(t));
      const topicsToSubscribe = [...newTopics].filter(t => !oldTopics.has(t));

      if (topicsToUnsubscribe.length > 0) connectionManager.unsubscribeFromTopic(brokerId, topicsToUnsubscribe);
      if (topicsToSubscribe.length > 0) connectionManager.subscribeToTopic(brokerId, topicsToSubscribe);
    });

    this.entities = newEntities;
    this.topicToActionMap = newTopicActionMap;
    console.log(`[DeviceRegistry] Sync completed. Entities: ${this.entities.size}, watching topics: ${this.topicToActionMap.size}`);
  }

  handleBrokerConnected(brokerId) {
    this.topicToActionMap.forEach((actions, topic) => {
      if (actions.some(action => action.brokerId === brokerId)) {
        connectionManager.subscribeToTopic(brokerId, topic);
      }
    });
  }
  
  handleMqttRawMessage(brokerId, topic, messageBuffer) {
    const actions = this.topicToActionMap.get(topic);
    if (actions) {
      const messageString = messageBuffer.toString();
      actions.forEach(action => {
        if (action.brokerId !== brokerId) return;

        const { entityId, property } = action;
        const entity = this.entities.get(entityId);
        if (entity) {
          const updatedEntity = {
            ...entity,
            [property]: messageString, // Проста логіка - просто оновлюємо поле
            last_updated: new Date().toISOString(),
          };
          this.entities.set(entityId, updatedEntity);
          eventBus.emit(`entity:update:${entityId}`, updatedEntity);
        }
      });
    }
  }

  getEntity(entityId) {
    return this.entities.get(entityId);
  }
}

export default new DeviceRegistry();