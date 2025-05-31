import mqtt from 'mqtt';
import EventEmitter from 'events';

class MqttClientWrapper extends EventEmitter {
    constructor(brokerConfig) {
        super();
        this.client = null;
        this.config = brokerConfig;

        // --- Формуємо повний URL з basepath тут ---
        let fullUrl = `${brokerConfig.secure ? 'wss' : 'ws'}://${brokerConfig.host}:${brokerConfig.port}`;
        if (brokerConfig.basepath && brokerConfig.basepath.length > 0) {
            // Переконуємось, що basepath починається з '/', але не закінчується на '/'
            let cleanedBasepath = brokerConfig.basepath.startsWith('/') ? brokerConfig.basepath : `/${brokerConfig.basepath}`;
            if (cleanedBasepath.endsWith('/')) {
                cleanedBasepath = cleanedBasepath.slice(0, -1);
            }
            fullUrl += cleanedBasepath;
        }
        this.mqttUrl = fullUrl;
        // -----------------------------------------------------------------

        this.options = {
            username: brokerConfig.username,
            password: brokerConfig.password,
            reconnectPeriod: 5000,
            clientId: `edwic-${Math.random().toString(16).substr(2, 8)}`,
            // --- 'path' з опцій ВИДАЛЕНИЙ, оскільки ми його вже додали до URL ---
            // path: brokerConfig.basepath, // ЦЕЙ РЯДОК БІЛЬШЕ НЕ ПОТРІБЕН
        };

        console.log("MqttClientWrapper: Final URL for connection:", this.mqttUrl); // Цей лог повинен показати повний URL
        console.log("MqttClientWrapper: Options for connection (excluding path):", this.options);
    }

    async connect() {
        return new Promise((resolve, reject) => {
            if (this.client && this.client.connected) {
                console.log(`[MQTT] Already connected to ${this.config.host} (ID: ${this.config.id})`);
                return resolve();
            }

            console.log(`[MQTT] Connecting to ${this.mqttUrl} (ID: ${this.config.id})...`);
            // Передаємо повний URL як перший аргумент
            this.client = mqtt.connect(this.mqttUrl, this.options);

            this.client.on('connect', () => {
                console.log(`[MQTT] Successfully connected to ${this.config.host} (ID: ${this.config.id})`);
                this.emit('connect', this.config.id);
                resolve();
            });

            this.client.on('error', (error) => {
                console.error(`[MQTT] Error for ${this.config.id} (${this.config.host}):`, error.message);
                this.emit('error', this.config.id, error);
                // reject(error); // Закоментовано reject, щоб mqtt.js міг спробувати перепідключитися
            });

            this.client.on('close', () => {
                console.log(`[MQTT] Disconnected from ${this.config.host} (ID: ${this.config.id})`);
                this.emit('disconnect', this.config.id);
            });

            this.client.on('message', (topic, message) => {
                this.emit('message', this.config.id, topic, message);
            });
        });
    }

    async disconnect() {
        return new Promise((resolve) => {
            if (this.client) {
                this.client.end(false, () => { // false означає, що не видаляти повідомлення в черзі
                    console.log(`[MQTT] Client for ${this.config.id} (${this.config.host}) ended.`);
                    this.client = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    subscribe(topic) {
        if (this.client && this.client.connected) {
            this.client.subscribe(topic, (err) => {
                if (err) console.error(`[MQTT] Error subscribing to ${topic} for ${this.config.id}:`, err.message);
                else console.log(`[MQTT] Subscribed to ${topic} for ${this.config.id}`);
            });
        } else {
            console.warn(`[MQTT] Not connected to ${this.config.id}. Cannot subscribe to ${topic}.`);
        }
    }

    unsubscribe(topic) {
        if (this.client && this.client.connected) {
            this.client.unsubscribe(topic, (err) => {
                if (err) console.error(`[MQTT] Error unsubscribing from ${topic} for ${this.config.id}:`, err.message);
                else console.log(`[MQTT] Unsubscribed from ${topic} for ${this.config.id}`);
            });
        } else {
            console.warn(`[MQTT] Not connected to ${this.config.id}. Cannot unsubscribe from ${topic}.`);
        }
    }

    publish(topic, message) {
        if (this.client && this.client.connected) {
            this.client.publish(topic, message, (err) => {
                if (err) console.error(`[MQTT] Error publishing to ${topic} for ${this.config.id}:`, err.message);
            });
        } else {
            console.warn(`[MQTT] Not connected to ${this.config.id}. Cannot publish to ${topic}.`);
        }
    }

    isConnected() {
        return this.client?.connected || false;
    }
}

export default MqttClientWrapper;