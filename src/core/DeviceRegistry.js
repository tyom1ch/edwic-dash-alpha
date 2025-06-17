// src/core/DeviceRegistry.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';

class DeviceRegistry {
    constructor() {
        this.entities = new Map();
        this.topicToEntityIdsMap = new Map();
        this.setupListeners();
        console.log("[DeviceRegistry] Initialized and listeners are set up.");
    }

    setupListeners() {
        eventBus.on('mqtt:raw_message', this.handleMqttRawMessage.bind(this));
        eventBus.on('broker:connected', this.handleBrokerConnected.bind(this));
    }

    syncFromAppConfig(appConfig) {
        console.log("[DeviceRegistry] Full sync from appConfig.");
        this.entities.clear();
        this.topicToEntityIdsMap.clear();
        if (!appConfig?.dashboards) return;
        Object.values(appConfig.dashboards).forEach(dashboard => {
            dashboard.components?.forEach(component => this.addEntity(component));
        });
        console.log(`[DeviceRegistry] Sync complete. ${this.entities.size} entities mapped.`);
    }

    /**
     * Додає сутність до внутрішніх реєстрів.
     * @param {object} component - Конфігурація компонента.
     */
    addEntity(component) {
        if (!component || !component.id) return;
        
        // --- ОСНОВНА ЗМІНА ТУТ ---
        // Перед додаванням шукаємо, чи є вже сутність з таким самим state_topic
        let initialValue = null;
        let lastUpdated = null;

        if (component.state_topic) {
            for (const existingEntity of this.entities.values()) {
                if (existingEntity.state_topic === component.state_topic && existingEntity.value !== null) {
                    console.log(`[DeviceRegistry] Found existing state for topic ${component.state_topic}. Using value: ${existingEntity.value}`);
                    initialValue = existingEntity.value;
                    lastUpdated = existingEntity.last_updated;
                    break; // Знайшли, виходимо з циклу
                }
            }
        }
        
        // Зберігаємо копію, використовуючи знайдене початкове значення
        this.entities.set(component.id, { 
            ...component, 
            value: initialValue, 
            last_updated: lastUpdated 
        });
        // --- КІНЕЦЬ ЗМІНИ ---

        // Оновлюємо карту "топік -> ID компонентів"
        if (component.state_topic) {
            if (!this.topicToEntityIdsMap.has(component.state_topic)) {
                this.topicToEntityIdsMap.set(component.state_topic, []);
            }
            // Уникаємо дублювання ID
            if (!this.topicToEntityIdsMap.get(component.state_topic).includes(component.id)) {
                this.topicToEntityIdsMap.get(component.state_topic).push(component.id);
            }
        }
    }
    
    addEntityAndSubscribe(component) {
        console.log(`[DeviceRegistry] Adding and subscribing: ${component.id}`);
        this.addEntity(component);
        if (component.state_topic && component.brokerId) {
            console.log(`[DeviceRegistry] Forcing subscription to: ${component.state_topic}`);
            connectionManager.subscribeToTopic(component.brokerId, component.state_topic);
        }
    }

    removeEntity(componentId) {
        const entity = this.entities.get(componentId);
        if (!entity) return null;
        this.entities.delete(componentId);
        if (entity.state_topic) {
            const ids = this.topicToEntityIdsMap.get(entity.state_topic);
            if (ids) {
                const index = ids.indexOf(componentId);
                if (index > -1) ids.splice(index, 1);
                if (ids.length === 0) this.topicToEntityIdsMap.delete(entity.state_topic);
            }
        }
        console.log(`[DeviceRegistry] Removed entity: ${componentId}`);
        return entity;
    }

    removeEntityAndUnsubscribe(componentId) {
        const removedEntity = this.removeEntity(componentId);
        if (!removedEntity || !removedEntity.state_topic) return;
        const isTopicStillInUse = this.topicToEntityIdsMap.has(removedEntity.state_topic);
        if (!isTopicStillInUse) {
            console.log(`[DeviceRegistry] Unsubscribing from unused topic: ${removedEntity.state_topic}`);
            connectionManager.unsubscribeFromTopic(removedEntity.brokerId, removedEntity.state_topic);
        }
    }

    handleBrokerConnected(brokerId) {
        console.log(`[DeviceRegistry] Broker "${brokerId}" connected. Subscribing...`);
        const topicsToSubscribe = new Set();
        this.entities.forEach(entity => {
            if (entity.brokerId === brokerId && entity.state_topic) {
                topicsToSubscribe.add(entity.state_topic);
            }
        });
        topicsToSubscribe.forEach(topic => connectionManager.subscribeToTopic(brokerId, topic));
    }

    handleMqttRawMessage(brokerId, topic, messageBuffer) {
        const entityIds = this.topicToEntityIdsMap.get(topic);
        if (entityIds?.length > 0) {
            const newValue = messageBuffer.toString();
            entityIds.forEach(entityId => {
                const entity = this.entities.get(entityId);
                if (entity) {
                    entity.value = newValue;
                    entity.last_updated = new Date().toISOString();
                    eventBus.emit('entity:update', { ...entity });
                }
            });
        }
    }

    getEntity(entityId) {
        return this.entities.get(entityId);
    }
}

export default new DeviceRegistry();