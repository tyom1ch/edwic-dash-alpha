import mqtt from "mqtt";
import EventEmitter from "events";

const RECONNECT_MIN_MS = 2000;
const RECONNECT_MAX_MS = 30000;

function nextReconnectDelay(current) {
  const base = typeof current === "number" && current >= RECONNECT_MIN_MS
    ? current
    : RECONNECT_MIN_MS;
  return Math.min(RECONNECT_MAX_MS, Math.round(base * 1.5));
}

class MqttClientWrapper extends EventEmitter {
  constructor(brokerConfig) {
    super();
    this.client = null;
    this._closing = false;
    this._opening = false;
    this._grewThisDrop = false;
    this.updateConfig(brokerConfig);
  }

  updateConfig(brokerConfig) {
    this.config = brokerConfig;
    let path = brokerConfig.basepath || "/";
    if (!path.startsWith("/")) path = `/${path}`;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    const protocol = brokerConfig.secure ? "wss" : "ws";
    this.mqttUrl = `${protocol}://${brokerConfig.host}:${brokerConfig.port}${path}`;

    const username = typeof brokerConfig.username === "string" ? brokerConfig.username.trim() : "";
    this.options = {
      manualConnect: true,
      reconnectPeriod: RECONNECT_MIN_MS,
      keepalive: 15,
      connectTimeout: 10000,
      clean: true,
      resubscribe: true,
      clientId: `edwic-${Math.random().toString(16).slice(2, 10)}`,
    };
    if (username) {
      this.options.username = username;
      this.options.password = brokerConfig.password || "";
    }
  }

  growBackoff() {
    const client = this.client;
    if (!client?.options || this._grewThisDrop) return false;
    this._grewThisDrop = true;
    client.options.reconnectPeriod = nextReconnectDelay(client.options.reconnectPeriod);
    return true;
  }

  logRetry(reason) {
    const delay = this.client?.options?.reconnectPeriod;
    if (delay !== nextReconnectDelay(RECONNECT_MIN_MS) && delay !== RECONNECT_MAX_MS) return;
    console.warn(`[MQTT] ${this.config.id} ${reason}, retry in ${delay}ms`);
  }

  async connect() {
    if (this.client?.connected) return;
    if (this.client) {
      this.nudge();
      return;
    }

    this._closing = false;
    this._opening = true;
    this.client = mqtt.connect(this.mqttUrl, this.options);
    const client = this.client;

    client.on("connect", () => {
      this._opening = false;
      this._grewThisDrop = false;
      if (client.options) client.options.reconnectPeriod = RECONNECT_MIN_MS;
      console.log(`[MQTT] Connected to ${this.config.host} (${this.config.id})`);
      this.emit("connect", this.config.id);
    });

    client.on("error", (error) => {
      if (this.growBackoff()) this.logRetry(error?.message || "error");
      this.emit("error", this.config.id, error);
    });

    client.on("offline", () => {
      if (!this.growBackoff()) return;
      this.logRetry("offline");
      this.emit("error", this.config.id, { message: "Брокер недоступний (Offline)" });
    });

    client.on("close", () => {
      this._opening = false;
      this._grewThisDrop = false;
    });

    client.on("message", (topic, message) => {
      this.emit("message", this.config.id, topic, message);
    });

    client.connect();
  }

  nudge() {
    const client = this.client;
    if (!client || client.connected || this._closing || this._opening || client.disconnecting) return;
    if (client.reconnecting || client.reconnectTimer) return;
    this._opening = true;
    client.reconnect();
  }

  hurry() {
    const client = this.client;
    if (!client || client.connected || this._closing || client.disconnecting || this._opening) return;
    if (client.reconnecting && !client.reconnectTimer) return;
    if (client.options) client.options.reconnectPeriod = RECONNECT_MIN_MS;
    this._grewThisDrop = false;
    this._opening = true;
    client.reconnect();
  }

  async disconnect() {
    const client = this.client;
    if (!client) return;
    this._closing = true;
    this._opening = false;
    await new Promise((resolve) => {
      client.removeAllListeners();
      client.end(true, () => {
        if (this.client === client) this.client = null;
        this._closing = false;
        this.emit("disconnect", this.config.id);
        resolve();
      });
    });
  }

  async reconnect(newConfig) {
    await this.disconnect();
    this.updateConfig(newConfig);
    await this.connect();
  }

  subscribe(topic) {
    if (this.client) {
      this.client.subscribe(topic, (err) => {
        if (err) console.error(`[MQTT] Subscribe ${topic} failed for ${this.config.id}:`, err.message);
      });
    }
  }

  unsubscribe(topic) {
    if (this.client) {
      this.client.unsubscribe(topic, (err) => {
        if (err) console.error(`[MQTT] Unsubscribe ${topic} failed for ${this.config.id}:`, err.message);
      });
    }
  }

  publish(topic, message) {
    if (this.client) {
      this.client.publish(topic, message, (err) => {
        if (err) console.error(`[MQTT] Publish ${topic} failed for ${this.config.id}:`, err.message);
      });
    }
  }

  isConnected() {
    return this.client?.connected || false;
  }
}

export default MqttClientWrapper;
