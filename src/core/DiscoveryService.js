// src/core/DiscoveryService.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';
import { WIDGET_REGISTRY } from './widgetRegistry';

const mapHaTypeToDashboardType = (entityConfig) => {
    const componentType = entityConfig.componentType || "unknown";
  
    if (componentType === 'climate') {
      const hasLowTempTopic = entityConfig.temperature_low_state_topic || entityConfig.temp_lo_stat_t;
      const hasHighTempTopic = entityConfig.temperature_high_state_topic || entityConfig.temp_hi_stat_t;
      return { type: "climate", variant: (hasLowTempTopic && hasHighTempTopic) ? "range" : "single" };
    }
  
    const knownWidgetTypes = WIDGET_REGISTRY.map(w => w.type);
    if (knownWidgetTypes.includes(componentType)) {
      return { type: componentType };
    }
  
    return { type: 'generic_info' };
};

class DiscoveryService {
    constructor() {
        this.discoveredDevices = new Map();
        this.configTopicToEntityId = new Map();
        this.currentDiscoveryTopic = null;
        this.availabilityTopics = new Map();
        this.setupListeners();
        console.log("[DiscoveryService] Initialized.");
    }

    setupListeners() {
        eventBus.on('broker:connected', (brokerId, brokerConfig) => this.updateDiscoverySubscription(brokerId, brokerConfig));
        // Події для очищення стану при зміні конфігурації
        eventBus.on('broker:reconnecting', () => this.clearDiscoveredData());
        eventBus.on('broker:removed', () => this.clearDiscoveredData());
        
        eventBus.on('mqtt:raw_message', this.handleMqttMessage.bind(this));
    }

    updateDiscoverySubscription(brokerId, brokerConfig) {
        const discoveryTopicBase = brokerConfig?.discovery_topic?.trim() || 'homeassistant';
        const newDiscoveryTopic = `${discoveryTopicBase}/#`;
        
        if (this.currentDiscoveryTopic !== newDiscoveryTopic) {
            if (this.currentDiscoveryTopic) {
                connectionManager.unsubscribeFromTopic(brokerId, this.currentDiscoveryTopic);
            }
            console.log(`[DiscoveryService] Subscribing to new discovery topic: ${newDiscoveryTopic}`);
            connectionManager.subscribeToTopic(brokerId, newDiscoveryTopic);
            this.currentDiscoveryTopic = newDiscoveryTopic;
            this.clearDiscoveredData(); // Очищуємо дані при зміні топіка
        }
    }

    clearDiscoveredData() {
        console.log("[DiscoveryService] Clearing all discovered data.");
        this.discoveredDevices.clear();
        this.configTopicToEntityId.clear();
        this.availabilityTopics.forEach((_, topic) => {
            // Потрібно буде відписатися від усіх availability топіків, але для цього потрібен brokerId
            // Це може потребувати більш складної логіки, поки що просто очищуємо мапу
        });
        this.availabilityTopics.clear();
        eventBus.emit('discovery:updated', []);
    }

    _getDeviceId(config) {
        const dev = config.device || config.dev || {};
        if (dev.identifiers && dev.identifiers[0]) return dev.identifiers[0];
        if (dev.connections && dev.connections[0] && dev.connections[0][1]) return dev.connections[0][1];
        if (dev.name) return dev.name;
        return config.unique_id || config.uniq_id;
    }

    handleMqttMessage(brokerId, topic, messageBuffer) {
        const message = messageBuffer.toString();
        if (!this.currentDiscoveryTopic) return;

        const baseTopic = this.currentDiscoveryTopic.replace('/#', '');
        
        if (this.availabilityTopics.has(topic)) {
            this.availabilityTopics.get(topic).forEach(entityId => this.updateEntityAvailability(entityId, message));
            return;
        }

        if (topic.startsWith(baseTopic) && topic.endsWith('/config')) {
            this.processConfigMessage(brokerId, topic, message);
        }
    }

    processConfigMessage(brokerId, topic, message) {
        if (!message) {
            this.removeEntityByTopic(topic);
            return;
        }

        try {
            const config = JSON.parse(message);
            const uniqueId = config.unique_id || config.uniq_id;
            if (!uniqueId) return;

            const deviceId = this._getDeviceId(config);
            if (!deviceId) return;

            const resolveTopic = (topicFragment, baseTopicPrefix) => {
                if (!topicFragment) return null;
                if (topicFragment.includes('+') || topicFragment.includes('#')) return topicFragment;
                return topicFragment.includes('~') ? topicFragment.replace(/~/g, baseTopicPrefix) : topicFragment;
            };

            const baseTopicPrefix = config['~'] || topic.substring(0, topic.lastIndexOf('/'));
            const haComponentType = topic.split('/')[1];
            const widgetInfo = mapHaTypeToDashboardType({ ...config, componentType: haComponentType });

            const entity = {
                id: uniqueId,
                name: config.name || uniqueId,
                componentType: haComponentType,
                type: widgetInfo.type,
                ...widgetInfo,
                brokerId,
                _config_topic: topic,
                available: true,
            };

            Object.keys(config).forEach(key => {
                const value = config[key];
                if (typeof value === 'string' && (key.endsWith('_t') || key.endsWith('_topic'))) {
                    entity[key] = resolveTopic(value, baseTopicPrefix);
                } else if (key !== 'device' && key !== 'dev') {
                    entity[key] = value;
                }
            });

            if (entity.type === 'sensor' && !entity.value_template && config.json_attributes_topic) {
                const keyFromStateTopic = config.state_topic.split('/').pop();
                entity.value_template = `{{ value_json.${keyFromStateTopic} }}`;
            } else if (entity.type === 'sensor' && !entity.value_template && entity.state_topic && entity.state_topic.includes('BTtoMQTT')) {
                const commonKeys = ['tempc', 'tempf', 'hum', 'batt', 'volt', 'rssi', 'temperature', 'humidity'];
                const keyInName = commonKeys.find(k => entity.name.toLowerCase().includes(k));
                if (keyInName) {
                    entity.value_template = `{{ value_json.${keyInName} }}`;
                }
            }

            const availabilityTopic = resolveTopic(config.availability_topic || config.avty_t, baseTopicPrefix);
            if (availabilityTopic) {
                if (!this.availabilityTopics.has(availabilityTopic)) {
                    this.availabilityTopics.set(availabilityTopic, new Set());
                    connectionManager.subscribeToTopic(brokerId, availabilityTopic);
                }
                this.availabilityTopics.get(availabilityTopic).add(entity.id);
                entity.payload_available = config.payload_available || 'online';
                entity.payload_not_available = config.payload_not_available || 'offline';
            }

            if (!this.discoveredDevices.has(deviceId)) {
                const dev = config.device || config.dev || {};
                this.discoveredDevices.set(deviceId, {
                    id: deviceId,
                    name: dev.name || deviceId,
                    model: dev.model || 'Unknown',
                    manufacturer: dev.manufacturer || 'Unknown',
                    entities: new Map()
                });
            }

            const device = this.discoveredDevices.get(deviceId);
            device.entities.set(entity.id, entity);
            this.configTopicToEntityId.set(topic, { deviceId, entityId: entity.id });

            eventBus.emit('discovery:updated', this.getDiscoveredDevices());

        } catch (e) {
            console.error(`[DiscoveryService] Error parsing config from topic ${topic}:`, e);
        }
    }
    
    updateEntityAvailability(entityId, payload) {
        for (const device of this.discoveredDevices.values()) {
            if (device.entities.has(entityId)) {
                const entity = device.entities.get(entityId);
                const isAvailable = payload === (entity.payload_available || 'online');
                if (entity.available !== isAvailable) {
                    entity.available = isAvailable;
                    eventBus.emit('discovery:updated', this.getDiscoveredDevices());
                }
                return;
            }
        }
    }

    removeEntityByTopic(configTopic) {
        if (this.configTopicToEntityId.has(configTopic)) {
            const { deviceId, entityId } = this.configTopicToEntityId.get(configTopic);
            const device = this.discoveredDevices.get(deviceId);
            if (device?.entities.has(entityId)) {
                device.entities.delete(entityId);
                if (device.entities.size === 0) {
                    this.discoveredDevices.delete(deviceId);
                }
                this.configTopicToEntityId.delete(configTopic);
                eventBus.emit('discovery:updated', this.getDiscoveredDevices());
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