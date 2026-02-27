// src/core/ConnectionManager.js
import MqttClientWrapper from './wrappers/MqttClientWrapper';
import eventBus from './EventBus';

class ConnectionManager {
    constructor() {
        this.mqttClients = new Map();
        console.log("[ConnectionManager] Initialized.");
        this.startWatchdog();
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
        // Коножні 15 секунд перевіряємо, чи всі клієнти підключені
        // Це допомагає підтримувати зв'язок, коли WebView засинає і прокидається
        setInterval(() => {
            this.mqttClients.forEach((client, id) => {
                if (!client.isConnected()) {
                    console.log(`[ConnectionManager] Watchdog: Broker ${id} is disconnected. Enforcing reconnect...`);
                    // Викликаємо reconnect з існуючою конфігурацією
                    client.reconnect(client.config).catch(e => {
                        console.error(`[ConnectionManager] Watchdog error reconnecting broker ${id}:`, e);
                    });
                }
            });
        }, 15000);
    }

    async updateBrokers(newBrokersConfig) {
        console.log("[ConnectionManager] Updating brokers configuration...");
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
                    // Сповіщаємо систему, що брокер зараз буде переконфігурований
                    eventBus.emit('broker:reconnecting', brokerConfig.id);
                    // AWAIT THE DISCONNECT FIRST to prevent race conditions
                    await existingClient.disconnect();
                    await existingClient.reconnect(brokerConfig);
                }
            } else {
                await this.addBroker(brokerConfig);
            }
        }
    }

    async addBroker(brokerConfig) {
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
        const client = this.mqttClients.get(brokerId);
        if (client) {
            console.log(`[ConnectionManager] Removing broker: ${brokerId}`);
            // Сповіщаємо систему про видалення перед відключенням
            eventBus.emit('broker:removed', brokerId);
            await client.disconnect();
            this.mqttClients.delete(brokerId);
        }
    }
    
    subscribeToTopic(brokerId, topic) {
        const client = this.mqttClients.get(brokerId);
        if (client) {
            client.subscribe(topic);
        } else {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for subscription to ${topic}.`);
        }
    }

    unsubscribeFromTopic(brokerId, topic) {
        const client = this.mqttClients.get(brokerId);
        if (client) {
            client.unsubscribe(topic);
        } else {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for unsubscription from ${topic}.`);
        }
    }

    publishToTopic(brokerId, topic, message) {
        const client = this.mqttClients.get(brokerId);
        if (client) {
            client.publish(topic, message);
        } else {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for publishing to ${topic}.`);
        }
    }

    isConnected(brokerId) {
        const client = this.mqttClients.get(brokerId);
        return client ? client.isConnected() : false;
    }
}

const connectionManagerInstance = new ConnectionManager();
export default connectionManagerInstance;
