// src/core/DiscoveryService.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';
import { WIDGET_REGISTRY } from './widgetRegistry';

const mapHaTypeToDashboardType = (entityConfig) => {
    const componentType = entityConfig.componentType || "unknown";
  
    // 1. Специфічні мапінги, які вимагають аналізу конфігурації
    if (componentType === 'climate') {
      const hasLowTempTopic = entityConfig.temperature_low_state_topic || entityConfig.temp_lo_stat_t;
      const hasHighTempTopic = entityConfig.temperature_high_state_topic || entityConfig.temp_hi_stat_t;
      if (hasLowTempTopic && hasHighTempTopic) {
        return { type: "climate", variant: "range" };
      }
      return { type: "climate", variant: "single" };
    }
  
    // 2. Перевірка, чи тип компонента напряму підтримується віджетами
    const knownWidgetTypes = WIDGET_REGISTRY.map(w => w.type);
    if (knownWidgetTypes.includes(componentType)) {
      return { type: componentType };
    }
  
    // 3. Якщо тип невідомий, повертаємо 'generic_info' як запасний варіант
    // console.log(`[DiscoveryService] Unsupported component type '${componentType}'. Mapping to 'generic_info'.`);
    return { type: 'generic_info' };
};

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

    /**
     * @private
     * Визначає унікальний ID пристрою з конфігурації, використовуючи ланцюжок пріоритетів.
     * 1. dev.ids[0] - стандартний ідентифікатор.
     * 2. dev.cns[0] - ідентифікатор зі списку з'єднань (напр., MAC-адреса).
     * 3. config.uniq_id - унікальний ID самої сутності як крайній захід.
     * @param {object} config - Об'єкт конфігурації сутності.
     * @returns {string|null} Унікальний ID пристрою або null, якщо знайти не вдалося.
     */
    _getDeviceId(config) {
        // Пріоритет 1: Використовувати перший ID з масиву 'ids'
        if (config.dev?.ids?.[0]) {
            return config.dev.ids[0];
        }

        // Пріоритет 2: Використовувати перший ідентифікатор з'єднання (connections)
        if (config.dev?.cns?.[0]?.[1]) {
            const [type, id] = config.dev.cns[0];
            // Створюємо унікальний рядок, наприклад, "mac_8c:aa:b5:7b:0e:24"
            return `${type}_${id}`; 
        }

        // Пріоритет 3: Як крайній захід, використовувати uniq_id сутності.
        // Це означає, що сутність буде розглядатися як власний "пристрій".
        if (config.uniq_id) {
            // console.warn(`[DiscoveryService] Device for entity '${config.uniq_id}' has no 'ids' or 'cns'. Using entity's uniq_id as a fallback device ID.`);
            return config.uniq_id;
        }

        return null; // Не знайдено жодного придатного ID
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
            
            if (!config.uniq_id) {
                console.warn('[DiscoveryService] Received config without unique_id. Skipping.', config);
                return;
            }

            const deviceId = this._getDeviceId(config);
            
            if (!deviceId) {
                console.error(`[DiscoveryService] Could not determine a device ID for entity with unique_id: ${config.uniq_id}. Skipping.`);
                return;
            }
            
            const baseTopicPrefix = config['~'] || null;
            const resolveTopic = (topicFragment) => {
                if (!topicFragment || !baseTopicPrefix) return topicFragment;
                return topicFragment.replace(/~/g, baseTopicPrefix);
            };

            const haComponentType = topic.split('/')[1];
            const widgetInfo = mapHaTypeToDashboardType({ ...config, componentType: haComponentType });
            
            const entity = {
                id: config.uniq_id,
                name: config.name || config.uniq_id,
                componentType: haComponentType, // Зберігаємо оригінальний тип HA для інформації
                type: widgetInfo.type,          // Це наш тип віджета для дашборду
                ...widgetInfo,                  // Додаємо інші властивості, як-от 'variant'
                brokerId,
                _config_topic: topic,
            };

            // Проходимо по всіх ключах конфігу і розгортаємо ті, що є топіками
            for (const key in config) {
                if (key.endsWith('_t') || key.endsWith('_topic')) {
                    entity[key] = resolveTopic(config[key]);
                } else if(key === 'dev') {
                    // Інформацію про пристрій (`dev`) обробляємо окремо, не копіюємо її в сутність
                    continue; 
                }
                else {
                    entity[key] = config[key]; // Копіюємо решту полів
                }
            }

            if (!this.discoveredDevices.has(deviceId)) {
                const deviceName = config.dev?.name || config.name || deviceId;
                
                this.discoveredDevices.set(deviceId, {
                    id: deviceId,
                    name: deviceName,
                    model: config.dev?.mdl || 'Unknown Model',
                    manufacturer: config.dev?.mf || 'Unknown Manufacturer',
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