// src/core/AlertService.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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

  handleRawMessage(brokerId, topic, messageBuffer) {
    if (!this.alerts || this.alerts.length === 0) return;
    
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
    const last = this.lastFired.get(alert.id) || 0;
    const intervalMs = alert.intervalMs || (5 * 60 * 1000); // Fallback to 5 mins if unset
    
    // Enforce rate limiting to prevent spamming the user's phone on rapidly updating topics
    if (now - last < intervalMs) {
      return; 
    }
    this.lastFired.set(alert.id, now);

    const message = alert.messageTemplate
      ? alert.messageTemplate.replace('{value}', value).replace('{topic}', alert.topic)
      : `Алерт: ${alert.name} (${value})`;

    // Emit internal event for the UI Snackbar
    eventBus.emit("app:alert_triggered", { alert, message });

    if (Capacitor.isNativePlatform()) {
      LocalNotifications.schedule({
        notifications: [
          {
            title: alert.name,
            body: message,
            id: Math.floor(Math.random() * 1000000), // Random notification ID
            schedule: { at: new Date(Date.now() + 100) }, // Schedule immediately
          }
        ]
      }).catch(err => {
        console.error("[AlertService] Native Notification Error:", err);
      });
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
