// src/core/DiscoveryService.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';

class DiscoveryService {
    constructor() {
        this.discoveredDevices = new Map();
        this.currentDiscoveryTopic = null; // Зберігаємо поточний топік (з #)
        this.setupListeners();
        console.log("[DiscoveryService] Initialized.");
    }

    setupListeners() {
        eventBus.on('broker:connected', (brokerId, brokerConfig) => {
            console.log(`[DiscoveryService] Broker ${brokerId} connected.`);
            this.updateDiscoverySubscription(brokerId, brokerConfig);
        });

        // Слухаємо зміни конфігурації, щоб перепідписатися на льоту
        eventBus.on('config:updated', (newConfig) => {
            console.log("[DiscoveryService] App config updated, checking for discovery topic changes.");
            const mainBroker = newConfig.brokers?.[0];
            if (mainBroker) {
                // Перевіряємо, чи брокер підключений. Якщо так, оновлюємо підписку.
                if (connectionManager.isConnected(mainBroker.id)) {
                    this.updateDiscoverySubscription(mainBroker.id, mainBroker);
                }
            }
        });

        eventBus.on('mqtt:raw_message', this.handleMqttMessage.bind(this));
    }

    updateDiscoverySubscription(brokerId, brokerConfig) {
        // Визначаємо топік для Discovery. Якщо поле порожнє, використовуємо 'homeassistant'.
        const discoveryTopicBase = brokerConfig?.discovery_topic?.trim() || 'homeassistant';
        const newDiscoveryTopicWithWildcard = `${discoveryTopicBase}/#`;

        // Якщо топік не змінився, нічого не робимо
        if (this.currentDiscoveryTopic === newDiscoveryTopicWithWildcard) {
            console.log(`[DiscoveryService] Discovery topic '${newDiscoveryTopicWithWildcard}' has not changed. No action needed.`);
            return;
        }

        // Відписуємось від старого топіка, якщо він був
        if (this.currentDiscoveryTopic) {
            console.log(`[DiscoveryService] Unsubscribing from old discovery topic: ${this.currentDiscoveryTopic}`);
            connectionManager.unsubscribeFromTopic(brokerId, this.currentDiscoveryTopic);
        }

        // Підписуємось на новий топік
        console.log(`[DiscoveryService] Subscribing to new discovery topic: ${newDiscoveryTopicWithWildcard}`);
        connectionManager.subscribeToTopic(brokerId, newDiscoveryTopicWithWildcard);
        
        // Оновлюємо поточний топік
        this.currentDiscoveryTopic = newDiscoveryTopicWithWildcard;

        // Очищуємо старі пристрої, оскільки топік змінився
        this.discoveredDevices.clear();
        eventBus.emit('discovery:updated', []);
        console.log("[DiscoveryService] Cleared old devices due to topic change.");
    }

    handleMqttMessage(brokerId, topic, messageBuffer) {
        if (!this.currentDiscoveryTopic) return;

        // Перевіряємо, чи повідомлення належить до поточного discovery топіка
        const baseTopic = this.currentDiscoveryTopic.replace('/#', '');
        if (!topic.startsWith(`${baseTopic}/`) || !topic.endsWith('/config')) {
            return;
        }

        try {
            const message = messageBuffer.toString();
            if (!message) {
                this.removeEntityByTopic(topic);
                return;
            }

            const config = JSON.parse(message);
            
            if (!config.uniq_id || !config.dev?.ids?.[0]) {
                console.warn('[DiscoveryService] Received config without unique_id or device id. Skipping.', config);
                return;
            }
            
            const baseTopicPrefix = config['~'] || null;
            const resolveTopic = (topicFragment) => {
                if (!topicFragment) return null;
                if (baseTopicPrefix && topicFragment.includes('~')) {
                    return topicFragment.replace(/~/g, baseTopicPrefix);
                }
                return topicFragment;
            };

            const stateTopic = resolveTopic(config.stat_t);
            const commandTopic = resolveTopic(config.cmd_t);
            const payloadOn = config.pl_on !== undefined ? String(config.pl_on) : 'ON';
            const payloadOff = config.pl_off !== undefined ? String(config.pl_off) : 'OFF';
            const componentType = topic.split('/')[1];

            const entity = {
                id: config.uniq_id,
                name: config.name || config.uniq_id,
                componentType,
                brokerId,
                state_topic: stateTopic,
                command_topic: commandTopic,
                payload_on: payloadOn,
                payload_off: payloadOff,
                device_class: config.dev_cla || null,
                unit_of_measurement: config.unit_of_measurement || '',
                _config_topic: topic 
            };
            
            const deviceId = config.dev.ids[0];
            if (!this.discoveredDevices.has(deviceId)) {
                this.discoveredDevices.set(deviceId, {
                    id: deviceId,
                    name: config.dev.name || deviceId,
                    model: config.dev.mdl || 'Unknown Model',
                    manufacturer: config.dev.mf || 'Unknown Manufacturer',
                    entities: new Map()
                });
            }
            
            const device = this.discoveredDevices.get(deviceId);
            device.entities.set(entity.id, entity);
            
            eventBus.emit('discovery:updated', this.getDiscoveredDevices());

        } catch (e) {
            console.error(`[DiscoveryService] Error parsing config from topic ${topic}:`, e);
        }
    }
    
    removeEntityByTopic(configTopic) {
        for (const device of this.discoveredDevices.values()) {
            for (const [entityId, entity] of device.entities.entries()) {
                if (entity._config_topic === configTopic) {
                    device.entities.delete(entityId);
                    if (device.entities.size === 0) {
                        this.discoveredDevices.delete(device.id);
                    }
                    eventBus.emit('discovery:updated', this.getDiscoveredDevices());
                    console.log(`[DiscoveryService] Removed entity ${entityId} due to empty config.`);
                    return;
                }
            }
        }
    }

    getDiscoveredDevices() {
        return Array.from(this.discoveredDevices.values()).map(device => ({
            ...device,
            entities: Array.from(device.entities.values())
        }));
    }
}

// Створюємо єдиний екземпляр сервісу
const discoveryServiceInstance = new DiscoveryService();
export default discoveryServiceInstance;