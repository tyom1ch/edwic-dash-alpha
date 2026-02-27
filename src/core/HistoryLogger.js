// src/core/HistoryLogger.js
import eventBus from './EventBus';
import { db } from './db';

class HistoryLogger {
  constructor() {
    this.monitoredTopics = new Set();
    this.lastLogTimestamps = new Map();
    // Default rate limit: log a maximum of once every 10 seconds per topic to avoid DB bloat
    this.rateLimitMs = 10000;
  }

  initialize() {
    eventBus.on('config:saved', this.handleConfigSaved.bind(this));
    eventBus.on('mqtt:raw_message', this.handleRawMessage.bind(this));
    
    // Periodically clean up history older than 7 days
    setInterval(() => this.cleanupOldHistory(), 1000 * 60 * 60 * 12); // Every 12 hours
    console.log("[HistoryLogger] Initialized.");
  }

  handleConfigSaved(config) {
    this.monitoredTopics.clear();
    
    // Scan all dashboards for HistoryGraphWidgets to know what topics to log
    Object.values(config.dashboards || {}).forEach(dash => {
      (dash.sections || []).forEach(section => {
        (section.cards || []).forEach(card => {
          if (card.type === 'history-graph' && card.brokerId && card.graph_topic) {
            const compositeKey = `${card.brokerId}::${card.graph_topic}`;
            this.monitoredTopics.add(compositeKey);
          }
        });
      });
    });
    console.log(`[HistoryLogger] Currently monitoring ${this.monitoredTopics.size} topics for history.`);
  }

  async handleRawMessage(brokerId, topic, messageBuffer) {
    const compositeKey = `${brokerId}::${topic}`;
    if (!this.monitoredTopics.has(compositeKey)) return;

    const messageString = messageBuffer.toString();
    const numericValue = parseFloat(messageString);
    
    if (isNaN(numericValue)) return; // Only log numbers for graphs

    const now = Date.now();
    const lastTimestamp = this.lastLogTimestamps.get(compositeKey) || 0;

    // Throttle writes: only save if rate limit exceeded
    if (now - lastTimestamp > this.rateLimitMs) {
      this.lastLogTimestamps.set(compositeKey, now);
      
      try {
        await db.history.put({
          brokerId,
          topic,
          value: numericValue,
          timestamp: now
        });
      } catch (e) {
        console.error("[HistoryLogger] Failed to write history metric:", e);
      }
    }
  }

  async cleanupOldHistory() {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = Date.now() - SEVEN_DAYS_MS;
    try {
      const deleteCount = await db.history.where('timestamp').below(cutoffDate).delete();
      if (deleteCount > 0) {
        console.log(`[HistoryLogger] Cleaned up ${deleteCount} old records.`);
      }
    } catch (e) {
      console.error("[HistoryLogger] Cleanup error:", e);
    }
  }
}

export default new HistoryLogger();
