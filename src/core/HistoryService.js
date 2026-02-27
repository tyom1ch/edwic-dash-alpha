// src/core/HistoryService.js
import eventBus from './EventBus';
import { db } from './db';

const RETAIN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SAVE_INTERVAL_MS = 30 * 1000; // Save max 1 data point per 30 seconds per topic

class HistoryService {
  constructor() {
    this.lastSaved = new Map(); // topic -> timestamp
    console.log("[HistoryService] Initialized.");
    this.setupListeners();
    this.pruneOldHistory(); // Clean up on boot
  }

  setupListeners() {
    eventBus.on('mqtt:raw_message', this.handleRawMessage.bind(this));
  }

  async handleRawMessage(brokerId, topic, messageBuffer) {
    if (!brokerId || !topic) return;

    const messageString = messageBuffer.toString();
    const value = parseFloat(messageString);

    // Only save numeric telemetry for graphs
    if (isNaN(value)) return;

    const now = Date.now();
    const compoundKey = `${brokerId}_${topic}`;
    const last = this.lastSaved.get(compoundKey) || 0;

    // Rate-limit history saves to prevent database explosion (e.g., max 1 per 30 seconds)
    if (now - last < SAVE_INTERVAL_MS) {
      return;
    }

    this.lastSaved.set(compoundKey, now);

    try {
        await db.history.put({
            brokerId,
            topic,
            timestamp: now,
            value: value
        });
    } catch (e) {
        console.error("[HistoryService] Failed to save history point", e);
    }
  }

  async pruneOldHistory() {
    try {
        const cutoff = Date.now() - RETAIN_INTERVAL_MS;
        const deleteCount = await db.history.where('timestamp').below(cutoff).delete();
        if (deleteCount > 0) {
            console.log(`[HistoryService] Pruned ${deleteCount} old historical records.`);
        }
    } catch (e) {
        console.error("[HistoryService] Failed to prune history", e);
    }
  }
}

export default new HistoryService();
