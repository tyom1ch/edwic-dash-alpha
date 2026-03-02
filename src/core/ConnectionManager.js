// src/core/ConnectionManager.js
import MqttClientWrapper from './wrappers/MqttClientWrapper';
import eventBus from './EventBus';
import { Capacitor, registerPlugin } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const NativeMqtt = isNative ? registerPlugin('NativeMqtt') : null;

class ConnectionManager {
    constructor() {
        this.mqttClients = new Map(); // Used only on web
        this._brokerConfigs = new Map(); // Track configs on all platforms
        this._nativeStatuses = new Map(); // Track native broker statuses
        console.log(`[ConnectionManager] Initialized. Native: ${isNative}`);
        if (!isNative) {
            this.startWatchdog();
        }
    }

    _isConfigEqual(oldConf, newConf) {
        if (!oldConf || !newConf) return false;
        return oldConf.host === newConf.host &&
               oldConf.port === newConf.port &&
               oldConf.protocol === newConf.protocol &&
               oldConf.username === newConf.username &&
               oldConf.password === newConf.password &&
               oldConf.clientId === newConf.clientId &&
               oldConf.path === newConf.path;
    }

    startWatchdog() {
        // Тільки для веб — на Android нативний сервіс сам робить reconnect
        setInterval(() => {
            this.mqttClients.forEach((client, id) => {
                if (!client.isConnected()) {
                    console.log(`[ConnectionManager] Watchdog: Broker ${id} is disconnected. Enforcing reconnect...`);
                    client.reconnect(client.config).catch(e => {
                        console.error(`[ConnectionManager] Watchdog error reconnecting broker ${id}:`, e);
                    });
                }
            });
        }, 15000);
    }

    async updateBrokers(newBrokersConfig) {
        console.log("[ConnectionManager] Updating brokers configuration...");

        if (isNative) {
            // На Android — делегуємо ВСЕ нативному сервісу, JS MQTT не створюємо
            // Зберігаємо конфіги для довідки
            const newIds = new Set(newBrokersConfig.map(b => b.id));
            
            // Видаляємо старі з трекера
            for (const oldId of this._brokerConfigs.keys()) {
                if (!newIds.has(oldId)) {
                    this._brokerConfigs.delete(oldId);
                    this._nativeStatuses.delete(oldId);
                }
            }
            
            // Додаємо/оновлюємо нові
            for (const brokerConfig of newBrokersConfig) {
                this._brokerConfigs.set(brokerConfig.id, brokerConfig);
            }
            
            // Нативний сервіс оновиться через CoreServices.js → NativeMqtt.updateBrokers()
            return;
        }

        // Веб-логіка — без змін
        const newBrokerIds = new Set(newBrokersConfig.map(b => b.id));
        const oldBrokerIds = new Set(this.mqttClients.keys());

        const brokersToRemove = [...oldBrokerIds].filter(id => !newBrokerIds.has(id));
        for (const brokerId of brokersToRemove) {
            await this.removeBroker(brokerId);
        }

        for (const brokerConfig of newBrokersConfig) {
            const existingClient = this.mqttClients.get(brokerConfig.id);

            if (existingClient) {
                if (!this._isConfigEqual(existingClient.config, brokerConfig)) {
                    console.log(`[ConnectionManager] Reconnecting broker ${brokerConfig.id} due to config change.`);
                    eventBus.emit('broker:reconnecting', brokerConfig.id);
                    await existingClient.disconnect();
                    await existingClient.reconnect(brokerConfig);
                }
            } else {
                await this.addBroker(brokerConfig);
            }
        }
    }

    async addBroker(brokerConfig) {
        if (isNative) return; // На Android — нативний сервіс керує

        if (this.mqttClients.has(brokerConfig.id)) {
            console.warn(`[ConnectionManager] Broker with ID ${brokerConfig.id} already exists. Skipping add.`);
            return;
        }

        const client = new MqttClientWrapper(brokerConfig);
        this.mqttClients.set(brokerConfig.id, client);

        client.on('connect', (id) => eventBus.emit('broker:connected', id, client.config));
        client.on('disconnect', (id) => eventBus.emit('broker:disconnected', id));
        client.on('error', (id, err) => eventBus.emit('broker:error', id, err));
        client.on('message', (id, topic, message) => eventBus.emit('mqtt:raw_message', id, topic, message));

        console.log(`[ConnectionManager] Adding new broker and connecting: ${brokerConfig.id}`);
        await client.connect();
    }

    async removeBroker(brokerId) {
        if (isNative) return; // На Android — нативний сервіс керує

        const client = this.mqttClients.get(brokerId);
        if (client) {
            console.log(`[ConnectionManager] Removing broker: ${brokerId}`);
            eventBus.emit('broker:removed', brokerId);
            await client.disconnect();
            this.mqttClients.delete(brokerId);
        }
    }

    async triggerReconnect(brokerId) {
        console.log(`[ConnectionManager] Triggered manual reconnect for broker: ${brokerId}`);
        if (isNative) {
            // Android: Just re-send the broker config to the native plugin.
            // It will disconnect and reconnect internally, dumping retained messages natively.
            const brokerConfig = this._brokerConfigs.get(brokerId);
            if (brokerConfig) {
                // We send it wrapped in an array as NativeMqtt expects for updateBrokers
                NativeMqtt.updateBrokers({ brokers: [brokerConfig] }).catch(e => {
                    console.error("[NativeMqtt] Failed to trigger reconnect:", e);
                });
            }
        } else {
            // Web: disconnect and connect wrapper
            const client = this.mqttClients.get(brokerId);
            if (client && client.config) {
                eventBus.emit('broker:reconnecting', brokerId);
                await client.disconnect();
                await client.reconnect(client.config);
            }
        }
    }
    
    subscribeToTopic(brokerId, topic) {
        if (isNative) {
            // На Android — тільки нативний сервіс
            NativeMqtt.subscribe({ brokerId, topic }).catch(e => 
                console.warn('[ConnectionManager] Native subscribe error:', e));
            return;
        }
        const client = this.mqttClients.get(brokerId);
        if (client) {
            client.subscribe(topic);
        } else {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for subscription to ${topic}.`);
        }
    }

    unsubscribeFromTopic(brokerId, topic) {
        if (isNative) {
            NativeMqtt.unsubscribe({ brokerId, topic }).catch(e => 
                console.warn('[ConnectionManager] Native unsubscribe error:', e));
            return;
        }
        const client = this.mqttClients.get(brokerId);
        if (client) {
            client.unsubscribe(topic);
        } else {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for unsubscription from ${topic}.`);
        }
    }

    publishToTopic(brokerId, topic, message) {
        if (isNative) {
            NativeMqtt.publish({ brokerId, topic, message: String(message) }).catch(e => 
                console.warn('[ConnectionManager] Native publish error:', e));
            return;
        }
        const client = this.mqttClients.get(brokerId);
        if (client) {
            client.publish(topic, message);
        } else {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for publishing to ${topic}.`);
        }
    }

    getConnectionStatus(brokerId) {
        if (isNative) {
            return this._nativeStatuses.get(brokerId) || 'offline';
        }
        const client = this.mqttClients.get(brokerId);
        return client && client.isConnected() ? 'connected' : 'offline';
    }

    isConnected(brokerId) {
        if (isNative) {
            // На Android статус визначається нативним сервісом через eventBus
            return this._nativeStatuses.get(brokerId) === 'connected';
        }
        const client = this.mqttClients.get(brokerId);
        return client ? client.isConnected() : false;
    }

    // Метод для оновлення статусу з нативного сервісу
    updateNativeStatus(brokerId, status) {
        this._nativeStatuses.set(brokerId, status);
    }
}

const connectionManagerInstance = new ConnectionManager();
export default connectionManagerInstance;
