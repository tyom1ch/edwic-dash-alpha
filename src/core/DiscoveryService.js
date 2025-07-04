// src/core/DiscoveryService.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';

class DiscoveryService {
    constructor() {
        this.discoveredDevices = new Map();
        this.currentDiscoveryTopic = null;
        this.setupListeners();
        console.log("[DiscoveryService] Initialized.");
    }

    setupListeners() {
        eventBus.on('broker:connected', (brokerId, brokerConfig) => {
            console.log(`[DiscoveryService] Broker ${brokerId} connected.`);
            this.updateDiscoverySubscription(brokerId, brokerConfig);
        });

        eventBus.on('config:updated', (newConfig) => {
            console.log("[DiscoveryService] App config updated, checking for discovery topic changes.");
            const mainBroker = newConfig.brokers?.[0];
            if (mainBroker && connectionManager.isConnected(mainBroker.id)) {
                this.updateDiscoverySubscription(mainBroker.id, mainBroker);
            }
        });

        eventBus.on('mqtt:raw_message', this.handleMqttMessage.bind(this));
    }

    updateDiscoverySubscription(brokerId, brokerConfig) {
        const discoveryTopicBase = brokerConfig?.discovery_topic?.trim() || 'homeassistant';
        const newDiscoveryTopicWithWildcard = `${discoveryTopicBase}/#`;

        if (this.currentDiscoveryTopic === newDiscoveryTopicWithWildcard) {
            return;
        }

        if (this.currentDiscoveryTopic) {
            connectionManager.unsubscribeFromTopic(brokerId, this.currentDiscoveryTopic);
        }

        console.log(`[DiscoveryService] Subscribing to new discovery topic: ${newDiscoveryTopicWithWildcard}`);
        connectionManager.subscribeToTopic(brokerId, newDiscoveryTopicWithWildcard);
        
        this.currentDiscoveryTopic = newDiscoveryTopicWithWildcard;
        this.discoveredDevices.clear();
        eventBus.emit('discovery:updated', []);
        console.log("[DiscoveryService] Cleared old devices due to topic change.");
    }

    handleMqttMessage(brokerId, topic, messageBuffer) {
        if (!this.currentDiscoveryTopic) return;

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
                if (!topicFragment || !baseTopicPrefix) return topicFragment;
                return topicFragment.replace(/~/g, baseTopicPrefix);
            };

            const componentType = topic.split('/')[1];
            
            // --- ЗМІНА: Зберігаємо всі поля з конфігу, розгортаючи топіки ---
            const entity = {
                id: config.uniq_id,
                name: config.name || config.uniq_id,
                componentType,
                brokerId,
                _config_topic: topic,
            };

            // Проходимо по всіх ключах конфігу і розгортаємо ті, що є топіками
            for (const key in config) {
                if (key.endsWith('_t') || key.endsWith('_topic')) { // Якщо ключ схожий на топік
                    entity[key] = resolveTopic(config[key]);
                } else if(key === 'dev') { // Обробляємо інформацію про пристрій
                    continue; 
                }
                else {
                    entity[key] = config[key]; // Копіюємо решту полів
                }
            }
            // --- КІНЕЦЬ ЗМІНИ ---

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

const discoveryServiceInstance = new DiscoveryService();
export default discoveryServiceInstance;