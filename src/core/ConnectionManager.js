import MqttClientWrapper from './wrappers/MqttClientWrapper';
import eventBus from './EventBus';

class ConnectionManager {
    constructor() {
        this.mqttClients = new Map(); // key: brokerId, value: MqttClientWrapper instance
        this.brokersConfig = [];      // Локальний кеш конфігурації брокерів

        console.log("[ConnectionManager] Initialized.");
        // setupGlobalListeners() не викликається тут, він буде налаштований App.jsx,
        // коли він підпишеться на події broker:connected/disconnected.
        // MqttClientWrapper вже емітує події напряму на EventBus.
    }

    /**
     * Ініціалізує та запускає підключення до брокерів на основі наданої конфігурації.
     * Відключає існуючі підключення, якщо конфігурація змінюється.
     * @param {Array<Object>} brokersConfig - Масив об'єктів конфігурації брокерів.
     */
    async initializeFromBrokersConfig(brokersConfig) {
        console.log("ConnectionManager.initializeFromBrokersConfig called with:", brokersConfig);
        
        // Оновлюємо локальний кеш конфігурації брокерів
        this.brokersConfig = brokersConfig;

        // Відключити та очистити всі існуючі клієнти перед створенням нових
        await Promise.all(Array.from(this.mqttClients.values()).map(client => client.disconnect().catch(() => {})));
        this.mqttClients.clear();
        
        if (!Array.isArray(brokersConfig) || brokersConfig.length === 0) {
            // console.log("ConnectionManager: No brokers configured or array is empty. Skipping connection setup.");
            
            // Можливо, емітувати подію, що брокерів немає, щоб UI міг оновитися
            // eventBus.emit('brokers:list_updated', this.getAllBrokers());
            return;
        }

        brokersConfig.forEach(brokerConfig => {
            // console.log("ConnectionManager: Processing broker from config:", brokerConfig.id, "Host:", brokerConfig.host);
            const client = new MqttClientWrapper(brokerConfig);
            this.mqttClients.set(brokerConfig.id, client);
            
            // Перенаправлення подій від цього конкретного клієнта на EventBus
            // Це те, що App.jsx та інші модулі будуть слухати
            client.on('connect', (id) => {
                console.log(`[ConnectionManager] Event: broker ${id} connected.`);
                eventBus.emit('broker:connected', id);
            });
            client.on('disconnect', (id) => {
                console.log(`[ConnectionManager] Event: broker ${id} disconnected.`);
                eventBus.emit('broker:disconnected', id);
            });
            client.on('error', (id, err) => {
                console.error(`[ConnectionManager] Event: broker ${id} error:`, err.message);
                eventBus.emit('broker:error', id, err);
            });
            client.on('message', (id, topic, message) => {
                // console.log(`[ConnectionManager] Event: raw MQTT message from ${id} on ${topic}`); // Може бути забагато логів
                eventBus.emit('mqtt:raw_message', id, topic, message);
            });
        });
        
        await this.connectAll(); // Спроба підключитися до всіх ініціалізованих брокерів
        // eventBus.emit('brokers:list_updated', this.getAllBrokers()); // Оновити UI після всіх спроб
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
        this.brokersConfig.push(brokerConfig); // Додати до локального кешу конфігурації

        // Перенаправлення подій від нового клієнта
        client.on('connect', (id) => { eventBus.emit('broker:connected', id); });
        client.on('disconnect', (id) => { eventBus.emit('broker:disconnected', id); });
        client.on('error', (id, err) => { eventBus.emit('broker:error', id, err); });
        client.on('message', (id, topic, message) => { eventBus.emit('mqtt:raw_message', id, topic, message); });

        console.log(`[ConnectionManager] Adding new broker: ${brokerConfig.id}`);
        await client.connect(); // Спробувати підключитися одразу
        eventBus.emit('broker:added', brokerConfig.id); // Повідомляємо, що додано новий брокер
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
            this.brokersConfig = this.brokersConfig.filter(b => b.id !== brokerId); // Видалити з локального кешу
            eventBus.emit('broker:removed', brokerId); // Повідомити, що брокер видалено
        } else {
            console.warn(`[ConnectionManager] Broker with ID ${brokerId} not found for removal.`);
        }
    }

    /**
     * Спроба підключитися до всіх ініціалізованих брокерів.
     */
    async connectAll() {
        // console.log("[ConnectionManager] Initiating connections for all configured brokers...");
        const connectPromises = Array.from(this.mqttClients.values()).map(client => client.connect().catch(e => console.error(`[ConnectionManager] Failed to connect to ${client.config.id} (${client.config.host}):`, e.message)));
        await Promise.allSettled(connectPromises); // Чекаємо на всі спроби, навіть якщо деякі невдалі
        // console.log("[ConnectionManager] All initial connection attempts finished.");
    }

    /**
     * Відключає всі активні MQTT-з'єднання.
     */
    async disconnectAll() {
        console.log("[ConnectionManager] Disconnecting all brokers...");
        const disconnectPromises = Array.from(this.mqttClients.values()).map(client => client.disconnect());
        await Promise.allSettled(disconnectPromises);
        console.log("[ConnectionManager] All brokers disconnected.");
    }

    /**
     * Підписує MQTT-клієнта на певний топік.
     * @param {string} brokerId - ID брокера.
     * @param {string} topic - Топік для підписки.
     */
    subscribeToTopic(brokerId, topic) {
        const client = this.mqttClients.get(brokerId);
        if (client) {
            client.subscribe(topic);
        } else {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for subscription to ${topic}.`);
        }
    }

    /**
     * Відписує MQTT-клієнта від певного топіка.
     * @param {string} brokerId - ID брокера.
     * @param {string} topic - Топік для відписки.
     */
    unsubscribeFromTopic(brokerId, topic) {
        const client = this.mqttClients.get(brokerId);
        if (client) {
            client.unsubscribe(topic);
        } else {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for unsubscription from ${topic}.`);
        }
    }

    /**
     * Публікує повідомлення на певний топік через брокера.
     * @param {string} brokerId - ID брокера.
     * @param {string} topic - Топік для публікації.
     * @param {string|Buffer} message - Повідомлення.
     */
    publishToTopic(brokerId, topic, message) {
        const client = this.mqttClients.get(brokerId);
        if (client) {
            client.publish(topic, message);
        } else {
            console.warn(`[ConnectionManager] Broker ${brokerId} not found for publishing to ${topic}.`);
        }
    }

    /**
     * Отримує статус підключення конкретного брокера.
     * @param {string} brokerId - ID брокера.
     * @returns {string} 'online', 'offline', 'not_configured'.
     */
    getBrokerStatus(brokerId) {
        const client = this.mqttClients.get(brokerId);
        return client ? (client.isConnected() ? 'online' : 'offline') : 'not_configured';
    }

    /**
     * Отримує список усіх сконфігурованих брокерів з їхнім поточним статусом.
     * @returns {Array<Object>} Масив об'єктів брокерів.
     */
    getAllBrokers() {
        // Повертаємо копію brokersConfig і додаємо статус для кожного
        return this.brokersConfig.map(config => ({
            ...config,
            status: this.getBrokerStatus(config.id)
        }));
    }
}

export default new ConnectionManager(); // Експортуємо синглтон