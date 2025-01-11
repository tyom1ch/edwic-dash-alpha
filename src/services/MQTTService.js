import mqtt from 'mqtt';

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect(host, username, password) {
    return new Promise((resolve, reject) => {
      const options = {
        port: 8080,
        username,
        password,
      };

      this.client = mqtt.connect(host, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('✅ Підключено до MQTT брокера');
        resolve();
      });

      this.client.on('error', (err) => {
        console.error(`❌ Помилка MQTT: ${err.message}`);
        this.client.end();
        reject(err);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        console.log('🔌 З\'єднання з MQTT брокером розірвано');
      });
    });
  }

  subscribe(topic, callback) {
    if (!this.client) {
      throw new Error('MQTT клієнт не підключено');
    }

    this.client.subscribe(topic);

    this.client.on('message', (receivedTopic, message) => {
      callback(receivedTopic, message.toString());
    });
  }

  publish(topic, message) {
    if (!this.client) {
      throw new Error('MQTT клієнт не підключено');
    }

    this.client.publish(topic, message);
  }
}

export default new MQTTService();