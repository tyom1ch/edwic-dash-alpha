// src/core/DeviceRegistry.js
import eventBus from "./EventBus";
import connectionManager from "./ConnectionManager";
import { getWidgetById } from "./widgetRegistry";
import { db } from "./db";

// Buffer for debouncing DB saves
let topicCacheBuffer = new Map();
let cacheSaveTimeout = null;

const flushTopicCache = async () => {
  if (topicCacheBuffer.size === 0) return;
  const itemsToSave = Array.from(topicCacheBuffer.values());
  topicCacheBuffer.clear();
  try {
    await db.topicCache.bulkPut(itemsToSave);
  } catch (err) {
    console.warn("[DeviceRegistry] Error saving topic cache:", err);
  }
};

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

  async syncFromAppConfig(appConfig) {
    console.log("[DeviceRegistry] Syncing with new application config...");
    const allComponents = (appConfig?.dashboards)
      ? Object.values(appConfig.dashboards).flatMap(d =>
          (d.sections || []).flatMap(s => s.cards || [])
        )
      : [];

    const oldTopicsByBroker = this._getTopicsByBroker(this.topicToActionMap);

    const newEntities = new Map();
    const newTopicActionMap = new Map();

    // 1. Fetch cache
    let cachedTopics = [];
    try {
      cachedTopics = await db.topicCache.toArray();
    } catch (err) {
      console.warn("[DeviceRegistry] Failed loading topic cache:", err);
    }
    const cacheMap = new Map();
    cachedTopics.forEach(item => {
      cacheMap.set(`${item.brokerId}:${item.topic}`, item);
    });

    allComponents.forEach((component) => {
      const widgetDef = getWidgetById(component.type);
      let finalComponentConfig = { ...component }; 
      let topicMappings = {};

      if (widgetDef?.getTopicMappings) {
        const generatedMappings = widgetDef.getTopicMappings(component);
        finalComponentConfig = { ...generatedMappings, ...component };
        topicMappings = generatedMappings;
      }
      
      const existingEntity = this.entities.get(component.id) || {};
      const newEntity = { ...existingEntity, ...finalComponentConfig };

      // ТУТ ФІКС: Відновлюємо живі дані, щоб конфіг їх не затер
      if (existingEntity._live_keys) {
        newEntity.last_updated = existingEntity.last_updated;
        newEntity._live_keys = existingEntity._live_keys;
        for (const prop in existingEntity._live_keys) {
          newEntity[prop] = existingEntity[prop]; 
        }
      }

      newEntities.set(component.id, newEntity);

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

          // PREFILL FROM CACHE IF NO LIVE DATA YET
          if (!newEntity._live_keys || !newEntity._live_keys[property]) {
            const cacheKey = `${component.brokerId}:${topic}`;
            const cachedItem = cacheMap.get(cacheKey);
            if (cachedItem) {
              newEntity[property] = cachedItem.value;
              // we don't mark it as _live_key here because it's stale cash, 
              // but we do show it in UI
              if (!newEntity.last_updated || new Date(cachedItem.timestamp) > new Date(newEntity.last_updated)) {
                newEntity.last_updated = cachedItem.timestamp;
              }
            }
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
      
      // SAVE TO CACHE BUFFER
      const cacheKey = `${brokerId}:${topic}`;
      topicCacheBuffer.set(cacheKey, {
        brokerId,
        topic,
        value: messageString,
        timestamp: new Date().toISOString()
      });
      // DEBOUNCE DB SAVE
      if (cacheSaveTimeout) clearTimeout(cacheSaveTimeout);
      cacheSaveTimeout = setTimeout(() => flushTopicCache(), 300);

      actions.forEach(action => {
        if (action.brokerId !== brokerId) return;

        const { entityId, property } = action;
        const entity = this.entities.get(entityId);
        if (entity) {
          const updatedEntity = {
            ...entity,
            [property]: messageString,
            last_updated: new Date().toISOString(),
            // +++ ДОДАЄМО МАРКЕР ЖИВИХ ДАНИХ +++
            _live_keys: { ...(entity._live_keys || {}), [property]: true }
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

  sendCommand(entityId, payload, commandKey = 'default') {
    const entity = this.entities.get(entityId);
    if (!entity) {
        console.warn(`[DeviceRegistry] Cannot send command: Entity ${entityId} not found.`);
        return;
    }

    const brokerId = entity.brokerId;
    if (!brokerId) {
        console.warn(`[DeviceRegistry] Cannot send command: Missing brokerId for ${entityId}.`);
        return;
    }

    // Attempt to get specific command mapping from widget definition if available
    let topicToPublish = null;
    let finalPayload = payload;

    const widgetDef = getWidgetById(entity.type);
    if (widgetDef?.getCommandMappings) {
        const mappings = widgetDef.getCommandMappings(entity);
        const commandDef = mappings[commandKey] || mappings['default'];
        
        if (typeof commandDef === 'string') {
            topicToPublish = commandDef;
        } else if (commandDef && typeof commandDef === 'object') {
            topicToPublish = commandDef.topic;
            if (typeof commandDef.transformer === 'function') {
                finalPayload = commandDef.transformer(payload);
            }
        }
    }

    // Fallback to legacy default command topics if no mapping matched
    if (!topicToPublish && (commandKey === 'default' || !commandKey)) {
        topicToPublish = entity.command_topic || entity.cmd_t;
    }
    
    if (!topicToPublish) {
        console.warn(`[DeviceRegistry] Cannot send command: Missing topic for entity ${entityId} and commandKey '${commandKey}'.`);
        return;
    }

    connectionManager.publishToTopic(brokerId, topicToPublish, String(finalPayload));
  }
}

export default new DeviceRegistry();