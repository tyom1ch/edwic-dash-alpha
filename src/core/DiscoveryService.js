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
  
    // Map standard actuators to 'switch'
    if (['switch', 'light', 'fan', 'lock', 'cover', 'valve', 'siren', 'water_heater'].includes(componentType)) {
      return { type: 'switch' };
    }
  
    // Sensors and numbers
    if (['sensor', 'binary_sensor', 'number', 'text', 'device_tracker'].includes(componentType)) {
      return { type: 'sensor' };
    }
    
    // Buttons and stateless
    if (['button', 'scene'].includes(componentType)) {
      return { type: 'button' };
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
        // Map<availTopic, { brokerId: string, entities: Set<entityId> }>
        this.availabilityTopics = new Map();
        this._debounceTimeout = null;
        this.setupListeners();
        console.log("[DiscoveryService] Initialized.");
    }

    setupListeners() {
        eventBus.on('broker:connected', (brokerId, brokerConfig) => this.updateDiscoverySubscription(brokerId, brokerConfig));
        
        eventBus.on('broker:reconnecting', (brokerId) => {
          console.log(`[DiscoveryService] Broker ${brokerId} is reconnecting. Clearing state...`);
          this.clearDiscoveredData();
          this.currentDiscoveryTopic = null;
        });
        
        eventBus.on('broker:removed', (brokerId) => {
          console.log(`[DiscoveryService] Broker ${brokerId} was removed. Clearing state.`);
          this.clearDiscoveredData();
          this.currentDiscoveryTopic = null;
        });
        
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
            this.clearDiscoveredData();
        }
    }

    clearDiscoveredData() {
        console.log("[DiscoveryService] Clearing all discovered data.");
        
        // Correctly unsubscribe from all availability tracking to prevent memory leaks
        for (const [topic, data] of this.availabilityTopics.entries()) {
            connectionManager.unsubscribeFromTopic(data.brokerId, topic);
        }
        
        this.discoveredDevices.clear();
        this.configTopicToEntityId.clear();
        this.availabilityTopics.clear();
        this.emitDebouncedUpdate();
    }

    emitDebouncedUpdate() {
        if (this._debounceTimeout) clearTimeout(this._debounceTimeout);
        this._debounceTimeout = setTimeout(() => {
            eventBus.emit('discovery:updated', this.getDiscoveredDevices());
        }, 200);
    }

    _getDeviceId(config) {
        const dev = config.device || config.dev || {};
        if (dev.identifiers && dev.identifiers[0]) return dev.identifiers[0];
        if (dev.connections && dev.connections[0] && dev.connections[0][1]) return dev.connections[0][1];
        if (dev.name) return dev.name;
        return config.unique_id || config.uniq_id;
    }

    handleMqttMessage(brokerId, topic, messageBuffer) {
        // Clear null bytes from some buggy microcontrollers
        const message = messageBuffer.toString('utf8').replace(/\0/g, '').trim();
        
        if (!this.currentDiscoveryTopic) return;
        const baseTopic = this.currentDiscoveryTopic.replace('/#', '');
        
        if (this.availabilityTopics.has(topic)) {
            const data = this.availabilityTopics.get(topic);
            data.entities.forEach(entityId => this.updateEntityAvailability(entityId, message));
            return;
        }

        if (topic.startsWith(`${baseTopic}/`) && topic.endsWith('/config')) {
            this.processConfigMessage(brokerId, topic, message, baseTopic);
        }
    }

    processConfigMessage(brokerId, topic, message, baseTopicPrefix) {
        if (!message) {
            this.removeEntityByTopic(topic);
            return;
        }

        try {
            const config = JSON.parse(message);
            const uniqueId = config.unique_id || config.uniq_id;
            
            // Validate minimal required fields.
            if (!uniqueId || (!config.state_topic && !config.stat_t && config.componentType !== 'button')) return;

            const deviceId = this._getDeviceId(config);
            if (!deviceId) return;

            // Strict extraction of HA component from topic: baseTopic/component/[node_id]/object_id/config
            const strippedTopic = topic.substring(baseTopicPrefix.length + 1, topic.length - 7);
            const topicParts = strippedTopic.split('/');
            if (topicParts.length < 2) return;
            const haComponentType = topicParts[0];

            const resolveTopic = (topicFragment, basePrefix) => {
                if (!topicFragment) return null;
                if (topicFragment.includes('+') || topicFragment.includes('#')) return topicFragment;
                return topicFragment.includes('~') ? topicFragment.replace(/~/g, basePrefix) : topicFragment;
            };

            const tildeBasePrefix = config['~'] || topic.substring(0, topic.lastIndexOf('/'));
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

            // Map configuration fields and resolve topic tildes
            Object.keys(config).forEach(key => {
                const value = config[key];
                if (typeof value === 'string' && (key.endsWith('_t') || key.endsWith('_topic'))) {
                    entity[key] = resolveTopic(value, tildeBasePrefix);
                } else if (key !== 'device' && key !== 'dev') {
                    entity[key] = value;
                }
            });

            // Availability subscription track
            const availabilityTopic = resolveTopic(config.availability_topic || config.avty_t, tildeBasePrefix);
            if (availabilityTopic) {
                if (!this.availabilityTopics.has(availabilityTopic)) {
                    this.availabilityTopics.set(availabilityTopic, { brokerId, entities: new Set() });
                    connectionManager.subscribeToTopic(brokerId, availabilityTopic);
                }
                this.availabilityTopics.get(availabilityTopic).entities.add(entity.id);
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

            this.emitDebouncedUpdate();

        } catch (e) {
            console.warn(`[DiscoveryService] Dropped malformed JSON from ${topic}.`);
        }
    }
    
    updateEntityAvailability(entityId, payload) {
        for (const device of this.discoveredDevices.values()) {
            if (device.entities.has(entityId)) {
                const entity = device.entities.get(entityId);
                const isAvailable = payload === (entity.payload_available || 'online');
                if (entity.available !== isAvailable) {
                    entity.available = isAvailable;
                    this.emitDebouncedUpdate();
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
                
                // Unsubscribe and cleanup availability trackers to prevent leaks
                for (const [availTopic, data] of this.availabilityTopics.entries()) {
                    if (data.entities.has(entityId)) {
                        data.entities.delete(entityId);
                        if (data.entities.size === 0) {
                            connectionManager.unsubscribeFromTopic(data.brokerId, availTopic);
                            this.availabilityTopics.delete(availTopic);
                        }
                    }
                }

                this.configTopicToEntityId.delete(configTopic);
                this.emitDebouncedUpdate();
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