// src/core/ConnectionManager.js
import MqttClientWrapper from './wrappers/MqttClientWrapper';
import eventBus from './EventBus';
import { Capacitor, registerPlugin } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const NativeMqtt = isNative ? registerPlugin('NativeMqtt') : null;

function topicsOf(topic) {
    if (Array.isArray(topic)) return topic.filter(item => typeof item === 'string' && item);
    if (typeof topic === 'string' && topic) return [topic];
    return [];
}

const WEB_FLUSH_MS = 32;
const WEB_FLUSH_BATCH = 40;
const MAX_WEB_PENDING = 2000;
const MAX_WEB_SEEN = 4000;

class ConnectionManager {
    constructor() {
        this.mqttClients = new Map(); // Used only on web
        this._brokerConfigs = new Map(); // Track configs on all platforms
        this._nativeStatuses = new Map(); // Track native broker statuses
        this._watchdogTimer = null; // Keep ref to avoid duplicate timers
        this._webPending = new Map();
        this._webLast = new Map();
        this._webFlushTimer = null;
        console.log(`[ConnectionManager] Initialized. Native: ${isNative}`);
        if (!isNative) {
            this.startWatchdog();
            this.listenForReturn();
        }
    }

    _isConfigEqual(oldConf, newConf) {
        if (!oldConf || !newConf) return false;
        const text = (value) => (value == null ? "" : String(value));
        return text(oldConf.host) === text(newConf.host) &&
               Number(oldConf.port) === Number(newConf.port) &&
               !!oldConf.secure === !!newConf.secure &&
               text(oldConf.username) === text(newConf.username) &&
               text(oldConf.password) === text(newConf.password) &&
               text(oldConf.basepath) === text(newConf.basepath);
    }

    startWatchdog() {
        if (this._watchdogTimer) clearInterval(this._watchdogTimer);
        // mqtt.js already retries. This only restarts a client that stopped trying.
        this._watchdogTimer = setInterval(() => {
            this.mqttClients.forEach((client) => client.nudge());
        }, 30000);
    }

    listenForReturn() {
        if (typeof window === 'undefined') return;
        window.addEventListener('online', () => this.hurryAll());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.hurryAll();
        });
        window.addEventListener('pagehide', () => {
            for (let i = 0; i < 8 && this._webPending.size > 0; i++) this.flushWebMessages();
        });
    }

    hurryAll() {
        this.mqttClients.forEach((client) => client.hurry());
    }

    queueWebMessage(id, topic, message) {
        const payload = message == null ? '' : message.toString();
        const key = `${id}\0${topic}`;
        if (payload.length <= 512 && this._webLast.get(key) === payload) return;
        if (payload.length <= 512) {
            this._webLast.set(key, payload);
            if (this._webLast.size > MAX_WEB_SEEN) {
                this._webLast.delete(this._webLast.keys().next().value);
            }
        }
        this._webPending.set(key, { id, topic, message: payload });
        if (this._webPending.size > MAX_WEB_PENDING) {
            for (const extra of this._webPending.keys()) {
                if (extra !== key) {
                    this._webPending.delete(extra);
                    this._webLast.delete(extra);
                    break;
                }
            }
        }
        if (this._webFlushTimer) return;
        this._webFlushTimer = setTimeout(() => this.flushWebMessages(), WEB_FLUSH_MS);
    }

    flushWebMessages() {
        if (this._webFlushTimer) {
            clearTimeout(this._webFlushTimer);
            this._webFlushTimer = null;
        }
        const batch = [];
        for (const [key, item] of this._webPending) {
            this._webPending.delete(key);
            batch.push(item);
            if (batch.length >= WEB_FLUSH_BATCH) break;
        }
        for (const item of batch) {
            eventBus.emit('mqtt:raw_message', item.id, item.topic, item.message);
        }
        if (this._webPending.size > 0 && !this._webFlushTimer) {
            this._webFlushTimer = setTimeout(() => this.flushWebMessages(), WEB_FLUSH_MS);
        }
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
        client.on('message', (id, topic, message) => this.queueWebMessage(id, topic, message));

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
            const prefix = `${brokerId}\0`;
            for (const key of this._webPending.keys()) {
                if (key.startsWith(prefix)) this._webPending.delete(key);
            }
            for (const key of this._webLast.keys()) {
                if (key.startsWith(prefix)) this._webLast.delete(key);
            }
        }
    }
    
    subscribeToTopic(brokerId, topic) {
        const topics = topicsOf(topic);
        if (topics.length === 0) return;
        if (isNative) {
            topics.forEach(one => {
                NativeMqtt.subscribe({ brokerId, topic: one }).catch(e =>
                    console.warn('[ConnectionManager] Native subscribe error:', e));
            });
            return;
        }
        const client = this.mqttClients.get(brokerId);
        if (!client) {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for subscription.`);
            return;
        }
        topics.forEach(one => client.subscribe(one));
    }

    unsubscribeFromTopic(brokerId, topic) {
        const topics = topicsOf(topic);
        if (topics.length === 0) return;
        if (isNative) {
            topics.forEach(one => {
                NativeMqtt.unsubscribe({ brokerId, topic: one }).catch(e =>
                    console.warn('[ConnectionManager] Native unsubscribe error:', e));
            });
            return;
        }
        const client = this.mqttClients.get(brokerId);
        if (!client) {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for unsubscription.`);
            return;
        }
        topics.forEach(one => client.unsubscribe(one));
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
