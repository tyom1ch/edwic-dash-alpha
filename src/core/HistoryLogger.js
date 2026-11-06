import eventBus from './EventBus';
import { db } from './db';
import { historySeriesOf, numericFromPayload } from './historySeries';

const RETAIN_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_MS = 10000;
const CLEANUP_MS = 12 * 60 * 60 * 1000;

class HistoryLogger {
  constructor() {
    this.monitored = new Map();
    this.lastLogTimestamps = new Map();
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    eventBus.on('config:saved', (config) => this.sync(config));
    eventBus.on('mqtt:raw_message', (brokerId, topic, message) => {
      this.handleRawMessage(brokerId, topic, message);
    });
    this.cleanupOldHistory();
    setInterval(() => this.cleanupOldHistory(), CLEANUP_MS);
  }

  sync(config) {
    const fallbackBrokerId = config?.brokers?.[0]?.id || null;
    const next = new Map();
    Object.values(config?.dashboards || {}).forEach((dash) => {
      (dash.sections || []).forEach((section) => {
        (section.cards || []).forEach((card) => {
          const series = historySeriesOf(card, fallbackBrokerId);
          if (!series) return;
          const key = `${series.brokerId}::${series.topic}`;
          const prev = next.get(key);
          next.set(key, { template: series.template || prev?.template || null });
        });
      });
    });
    this.monitored = next;
  }

  handleRawMessage(brokerId, topic, messageBuffer) {
    const key = `${brokerId}::${topic}`;
    const entry = this.monitored.get(key);
    if (!entry) return;

    const raw = messageBuffer == null ? '' : messageBuffer.toString();
    const numericValue = numericFromPayload(raw, entry.template);
    if (numericValue === null) return;

    const now = Date.now();
    if (now - (this.lastLogTimestamps.get(key) || 0) < RATE_LIMIT_MS) return;
    this.lastLogTimestamps.set(key, now);

    db.history.put({
      brokerId,
      topic,
      value: numericValue,
      timestamp: now,
    }).catch((e) => {
      console.error('[HistoryLogger] Failed to write history metric:', e);
    });
  }

  async cleanupOldHistory() {
    const cutoffDate = Date.now() - RETAIN_MS;
    try {
      await db.history.where('timestamp').below(cutoffDate).delete();
    } catch (e) {
      console.error('[HistoryLogger] Cleanup error:', e);
    }
  }
}

export default new HistoryLogger();
