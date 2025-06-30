// src/core/ConnectionManager.js
import MqttClientWrapper from './wrappers/MqttClientWrapper';
import eventBus from './EventBus';

class ConnectionManager {
    constructor() {
        this.mqttClients = new Map(); // key: brokerId, value: MqttClientWrapper instance
        console.log("[ConnectionManager] Initialized.");
    }

    /**
     * Оновлює конфігурацію брокерів, підключаючи нові, відключаючи видалені
     * та оновлюючи існуючі без розриву з'єднання, якщо це можливо.
     * @param {Array<Object>} newBrokersConfig - Новий масив конфігурації брокерів.
     */
    async updateBrokers(newBrokersConfig) {
        console.log("[ConnectionManager] Updating brokers configuration...");
        const newBrokerIds = new Set(newBrokersConfig.map(b => b.id));
        const oldBrokerIds = new Set(this.mqttClients.keys());

        // 1. Відключити та видалити брокери, яких більше немає в конфігурації
        const brokersToRemove = [...oldBrokerIds].filter(id => !newBrokerIds.has(id));
        for (const brokerId of brokersToRemove) {
            await this.removeBroker(brokerId);
        }

        // 2. Додати нові або оновити існуючі брокери
        for (const brokerConfig of newBrokersConfig) {
            const existingClient = this.mqttClients.get(brokerConfig.id);

            if (existingClient) {
                // Брокер вже існує, перевіряємо, чи змінилася конфігурація
                if (JSON.stringify(existingClient.config) !== JSON.stringify(brokerConfig)) {
                    console.log(`[ConnectionManager] Reconnecting broker ${brokerConfig.id} due to config change.`);
                    await existingClient.reconnect(brokerConfig);
                }
            } else {
                // Це новий брокер, додаємо його
                await this.addBroker(brokerConfig);
            }
        }
    }

    /**
     * Додає новий брокер до списку та ініціює його підключення.
     * @param {Object} brokerConfig - Конфігурація нового брокера.
     */
    async addBroker(brokerConfig) {
        if (this.mqttClients.has(brokerConfig.id)) {
            console.warn(`[ConnectionManager] Broker with ID ${brokerConfig.id} already exists. Skipping add.`);
            return;
        }

        const client = new MqttClientWrapper(brokerConfig);
        this.mqttClients.set(brokerConfig.id, client);

        // Перенаправлення подій від нового клієнта
        client.on('connect', (id) => eventBus.emit('broker:connected', id, client.config));
        client.on('disconnect', (id) => eventBus.emit('broker:disconnected', id));
        client.on('error', (id, err) => eventBus.emit('broker:error', id, err));
        client.on('message', (id, topic, message) => eventBus.emit('mqtt:raw_message', id, topic, message));

        console.log(`[ConnectionManager] Adding new broker and connecting: ${brokerConfig.id}`);
        await client.connect();
    }

    /**
     * Видаляє брокер зі списку та відключає його.
     * @param {string} brokerId - ID брокера для видалення.
     */
    async removeBroker(brokerId) {
        const client = this.mqttClients.get(brokerId);
        if (client) {
            console.log(`[ConnectionManager] Removing broker: ${brokerId}`);
            await client.disconnect();
            this.mqttClients.delete(brokerId);
        }
    }
    
    // --- ЗАЛИШАЄМО ВСІ ІНШІ МЕТОДИ БЕЗ ЗМІН ---

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

// Експортуємо єдиний екземпляр (синглтон)
const connectionManagerInstance = new ConnectionManager();
export default connectionManagerInstance;