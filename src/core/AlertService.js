// src/core/AlertService.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { db, pruneNotifications } from './db';

class AlertService {
  constructor() {
    this.alerts = [];
    this.lastFired = new Map(); // id -> timestamp

    console.log("[AlertService] Initialized.");
    this.setupListeners();
  }

  setupListeners() {
    eventBus.on('config:saved', this.handleConfigSaved.bind(this));
    eventBus.on('broker:connected', this.handleBrokerConnected.bind(this));
    eventBus.on('mqtt:raw_message', this.handleRawMessage.bind(this));
  }

  handleConfigSaved(config) {
    this.alerts = config.alerts || [];
    
    // Force subscription for all active alerts 
    // DeviceRegistry will subscribe to widget topics, AlertService subscribes to alert topics
    if (this.alerts.length > 0) {
      console.log(`[AlertService] Ensuring subscriptions for ${this.alerts.length} active alerts`);
      this.alerts.forEach(alert => {
        if (alert.enabled && alert.brokerId && alert.topic) {
          connectionManager.subscribeToTopic(alert.brokerId, alert.topic);
        }
      });
    }
  }

  handleBrokerConnected(brokerId) {
    this.alerts.forEach(alert => {
      if (alert.enabled && alert.brokerId === brokerId && alert.topic) {
        connectionManager.subscribeToTopic(brokerId, alert.topic);
      }
    });
  }

  handleRawMessage(brokerId, topic, messageBuffer, options = {}) {
    if (Capacitor.isNativePlatform()) {
        return; // Android natively evaluates alerts in MqttBackgroundService!
    }

    if (!this.alerts || this.alerts.length === 0) return;
    
    // Skip evaluating alerts for historical messages buffering into JS on app resume.
    if (options.buffered) {
        return; 
    }

    const messageString = messageBuffer.toString();
    const numericValue = parseFloat(messageString);

    const relevantAlerts = this.alerts.filter(a => a.enabled && a.brokerId === brokerId && a.topic === topic);

    for (const alert of relevantAlerts) {
      this.evaluateAlert(alert, messageString, numericValue);
    }
  }

  evaluateAlert(alert, rawString, numericValue) {
    const isNum = !isNaN(numericValue);
    const thresholdNum = parseFloat(alert.threshold);
    const isThresholdNum = !isNaN(thresholdNum);
    
    let isTriggered = false;

    if (alert.condition === '>') {
      isTriggered = (isNum && isThresholdNum) ? (numericValue > thresholdNum) : (rawString > alert.threshold);
    } else if (alert.condition === '<') {
      isTriggered = (isNum && isThresholdNum) ? (numericValue < thresholdNum) : (rawString < alert.threshold);
    } else if (alert.condition === '==') {
      // Allow exact string match or numeric match
      isTriggered = (isNum && isThresholdNum) ? (numericValue === thresholdNum) : (rawString === alert.threshold);
    } else if (alert.condition === '!=') {
      isTriggered = (isNum && isThresholdNum) ? (numericValue !== thresholdNum) : (rawString !== alert.threshold);
    }

    if (isTriggered) {
      this.fireNotification(alert, rawString);
    }
  }

  fireNotification(alert, value) {
    const now = Date.now();
    
    // Deduplication constraint (independent of the UI rate limit `intervalMs`).
    // If we just fired THIS exact alert for THIS exact value less than 15 seconds ago, ignore it.
    // This prevents the UI from saving 5 duplicate alerts if the sensor rapid-fires identical payload ticks.
    const lastFiredTime = this.lastFired.get(`${alert.id}_${value}`) || 0;
    if (now - lastFiredTime < 15000) {
      return;
    }
    this.lastFired.set(`${alert.id}_${value}`, now);

    const lastUINotified = this.lastFired.get(alert.id) || 0;
    const intervalMs = alert.intervalMs || (5 * 60 * 1000); // Fallback to 5 mins if unset

    const message = alert.messageTemplate
      ? alert.messageTemplate.replace('{value}', value).replace('{topic}', alert.topic)
      : `Алерт: ${alert.name} (${value})`;

    // Store in internal IndexedDB for the top-bar Notification Menu
    // ALWAYS STORE (unless it was already deduped above)
    db.notifications.put({
      timestamp: now,
      title: alert.name,
      message: message,
      read: 0
    }).then(() => pruneNotifications())
      .catch(e => console.error("[AlertService] DB Error:", e));
    
    // Enforce UI rate limiting to prevent spamming the user's screen
    if (now - lastUINotified < intervalMs) {
      return; 
    }
    this.lastFired.set(alert.id, now);

    // Emit internal event for the UI Snackbar
    eventBus.emit("app:alert_triggered", { alert, message });

    if (Capacitor.isNativePlatform()) {
      // На Android нотифікації створює нативний MqttBackgroundService напряму через
      // NotificationManager. JS НЕ дублює — тут лише IndexedDB + UI snackbar вище.
      console.log(`[AlertService] Native alert skipped (handled by background service).`);
    } else {
      console.log(`[AlertService] NOTIFICATION TRIGGERED (Web Fallback): ${alert.name} - ${message}`);
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(alert.name, { body: message });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              new Notification(alert.name, { body: message });
            }
          });
        }
      }
    }
  }
}

export default new AlertService();
