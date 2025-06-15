// src/core/DeviceRegistry.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';

class DeviceRegistry {
    constructor() {
        this.entities = new Map();
        this.topicToEntityIdsMap = new Map();
        
        // ВАЖЛИВО: Налаштовуємо слухачів одразу
        this.setupListeners();
        console.log("[DeviceRegistry] Initialized and listeners are set up.");
    }

    setupListeners() {
        // Слухаємо сирі MQTT-повідомлення
        eventBus.on('mqtt:raw_message', this.handleMqttRawMessage.bind(this));
        
        // --- НОВА КЛЮЧОВА ЛОГІКА ---
        // Слухаємо, коли брокер успішно підключився
        eventBus.on('broker:connected', this.handleBrokerConnected.bind(this));
    }

    /**
     * Цей метод тепер просто запам'ятовує, що і де знаходиться, але НЕ робить підписки.
     */
    syncFromAppConfig(appConfig) {
        console.log("[DeviceRegistry] Syncing config. Just mapping entities, no subscriptions yet.");
        this.entities.clear();
        this.topicToEntityIdsMap.clear();

        if (!appConfig?.dashboards) return;

        Object.values(appConfig.dashboards).forEach(dashboard => {
            dashboard.components?.forEach(component => {
                this.entities.set(component.id, { ...component, value: null, last_updated: null });
                if (component.state_topic) {
                    if (!this.topicToEntityIdsMap.has(component.state_topic)) {
                        this.topicToEntityIdsMap.set(component.state_topic, []);
                    }
                    this.topicToEntityIdsMap.get(component.state_topic).push(component.id);
                }
            });
        });
        console.log(`[DeviceRegistry] Sync complete. ${this.entities.size} entities mapped.`);
    }

    /**
     * Цей метод викликається, коли брокер підключився.
     * Саме тут ми будемо робити підписки!
     * @param {string} brokerId - ID брокера, що підключився.
     */
    handleBrokerConnected(brokerId) {
        console.log(`[DeviceRegistry] Broker "${brokerId}" connected. Subscribing to its topics...`);
        
        // Збираємо всі унікальні топіки, які належать ЦЬОМУ брокеру
        const topicsToSubscribe = new Set();
        this.entities.forEach(entity => {
            if (entity.brokerId === brokerId && entity.state_topic) {
                topicsToSubscribe.add(entity.state_topic);
            }
        });

        // Підписуємось
        topicsToSubscribe.forEach(topic => {
            console.log(`[DeviceRegistry] Requesting subscription to: "${topic}" via broker "${brokerId}"`);
            connectionManager.subscribeToTopic(brokerId, topic);
        });
    }

    handleMqttRawMessage(brokerId, topic, messageBuffer) {
        const entityIds = this.topicToEntityIdsMap.get(topic);
        if (entityIds?.length > 0) {
            const newValue = this.parseMqttPayload(messageBuffer);
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

    parseMqttPayload(messageBuffer) {
        return messageBuffer.toString();
    }

    getEntity(entityId) {
        return this.entities.get(entityId);
    }
}

export default new DeviceRegistry();