// src/core/DeviceRegistry.js
import eventBus from "./EventBus";
import connectionManager from "./ConnectionManager";
import { getWidgetById } from "./widgetRegistry";

class DeviceRegistry {
  constructor() {
    this.entities = new Map();
    // FIX: Value is now an array of actions to support multiple entities on one topic.
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
      const existingEntity = this.entities.get(component.id) || {};
      newEntities.set(component.id, { ...existingEntity, ...component });

      const widgetDef = getWidgetById(component.type);
      if (widgetDef?.getTopicMappings) {
        const topicMappings = widgetDef.getTopicMappings(component);
        for (const property in topicMappings) {
          const topic = topicMappings[property];
          if (topic && component.brokerId) {
            // FIX: Handle multiple actions per topic
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
      }
    });

    const newTopicsByBroker = this._getTopicsByBroker(newTopicActionMap);
    const allBrokerIds = new Set([...oldTopicsByBroker.keys(), ...newTopicsByBroker.keys()]);

    allBrokerIds.forEach(brokerId => {
        const oldTopics = oldTopicsByBroker.get(brokerId) || new Set();
        const newTopics = newTopicsByBroker.get(brokerId) || new Set();
        const topicsToUnsubscribe = [...oldTopics].filter(t => !newTopics.has(t));
        const topicsToSubscribe = [...newTopics].filter(t => !oldTopics.has(t));

        topicsToUnsubscribe.forEach(topic => connectionManager.unsubscribeFromTopic(brokerId, topic));
        topicsToSubscribe.forEach(topic => connectionManager.subscribeToTopic(brokerId, topic));
    });

    this.entities = newEntities;
    this.topicToActionMap = newTopicActionMap;
    console.log(`[DeviceRegistry] Sync completed. Entities: ${this.entities.size}, watching topics: ${this.topicToActionMap.size}`);
  }

  handleBrokerConnected(brokerId) {
    console.log(`[DeviceRegistry] Broker "${brokerId}" connected. Re-subscribing...`);
    this.topicToActionMap.forEach((actions, topic) => {
      if (actions.some(action => action.brokerId === brokerId)) {
        connectionManager.subscribeToTopic(brokerId, topic);
      }
    });
  }
  
  handleMqttRawMessage(brokerId, topic, messageBuffer) {
    const actions = this.topicToActionMap.get(topic); // Direct lookup
    if (actions) {
      const messageString = messageBuffer.toString();
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
  }

  getEntity(entityId) {
    return this.entities.get(entityId);
  }
}

export default new DeviceRegistry();
