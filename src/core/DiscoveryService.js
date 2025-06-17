// src/core/DiscoveryService.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';

class DiscoveryService {
    constructor() {
        this.discoveredDevices = new Map();
        this.setupListeners();
        console.log("[DiscoveryService] Initialized.");
    }

    setupListeners() {
        eventBus.on('broker:connected', (brokerId) => {
            console.log(`[DiscoveryService] Broker ${brokerId} connected, subscribing to homeassistant/#`);
            connectionManager.subscribeToTopic(brokerId, 'homeassistant/#');
        });

        eventBus.on('mqtt:raw_message', this.handleMqttMessage.bind(this));
    }

    handleMqttMessage(brokerId, topic, messageBuffer) {
        if (!topic.startsWith('homeassistant/') || !topic.endsWith('/config')) {
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
            
            const baseTopic = config['~'] || null;
            const resolveTopic = (topicFragment) => {
                if (!topicFragment) return null;
                if (baseTopic && topicFragment.includes('~')) {
                    return topicFragment.replace(/~/g, baseTopic);
                }
                return topicFragment;
            };

            const stateTopic = resolveTopic(config.stat_t);
            const commandTopic = resolveTopic(config.cmd_t);
            
            // --- ЗМІНА ---
            // Зчитуємо payload. У вашому прикладі для OpenBK це "1" та "0".
            // Якщо не вказано, HA за замовчуванням використовує "ON" та "OFF".
            const payloadOn = config.pl_on !== undefined ? String(config.pl_on) : 'ON';
            const payloadOff = config.pl_off !== undefined ? String(config.pl_off) : 'OFF';
            // --- КІНЕЦЬ ЗМІНИ ---

            const componentType = topic.split('/')[1];

            const entity = {
                id: config.uniq_id,
                name: config.name || config.uniq_id,
                componentType,
                brokerId,
                state_topic: stateTopic,
                command_topic: commandTopic,
                // --- ЗМІНА ---
                payload_on: payloadOn,
                payload_off: payloadOff,
                // --- КІНЕЦЬ ЗМІНИ ---
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

export default new DiscoveryService();