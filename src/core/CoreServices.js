// src/core/CoreServices.js
import connectionManager from './ConnectionManager';
import deviceRegistry from './DeviceRegistry';
import eventBus from './EventBus';
import './DiscoveryService';
import './AlertService';
import historyLogger from './HistoryLogger';
import { Capacitor } from '@capacitor/core';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

let isCoreInitialized = false;
let isForegroundServiceStarted = false; // Track if service is running

// ── Internal broker status tracking ──────────────────────────────────────────
const brokerStatusMap = new Map(); // brokerId → { name, status }
let brokerConfigList = [];

const STATUS_LABELS = {
  connected: '[OK]',
  connecting: '[..]',
  reconnecting: '[..]',
  offline: '[--]',
  error: '[!!]',
};

const buildNotificationBody = () => {
  if (brokerStatusMap.size === 0) return 'Немає брокерів';
  const lines = [];
  for (const [, info] of brokerStatusMap) {
    const label = STATUS_LABELS[info.status] || '[?]';
    lines.push(`${label} ${info.name}`);
  }
  return lines.join('  ');
};

// ── Notification update logic ──────────────────────────────────────────────────
// Android status bar decorates emoji inconsistently — use ASCII labels instead.
// We use updateForegroundService() for updates (correct API), only
// startForegroundService() on first start.
const NOTIF_OPTIONS = (body) => ({
  id: 1993,
  title: 'EdWic',
  body,
  smallIcon: 'ic_notification', // Must exist in res/drawable/
  silent: true,
  notificationChannelId: 'edwic_bg_service',
});

const updateForegroundNotification = async () => {
  if (!Capacitor.isNativePlatform()) return;
  const body = buildNotificationBody();
  try {
    if (isForegroundServiceStarted) {
      // Use the dedicated update method — does NOT restart the service
      await ForegroundService.updateForegroundService(NOTIF_OPTIONS(body));
    }
  } catch (e) {
    console.warn('[CoreServices] Notification update failed:', e?.message);
  }
};

const setBrokerStatus = (brokerId, status) => {
  const existing = brokerStatusMap.get(brokerId);
  if (existing) {
    existing.status = status;
  } else {
    const cfg = brokerConfigList.find(b => b.id === brokerId);
    brokerStatusMap.set(brokerId, {
      name: cfg ? (cfg.name || cfg.host) : brokerId,
      status,
    });
  }
  updateForegroundNotification();
};

// ── Event listener setup ──────────────────────────────────────────────────────
const setupEventListeners = () => {
  eventBus.on('config:saved', (newConfig) => {
    console.log('[CoreServices] Detected config change, synchronizing services...');

    brokerConfigList = newConfig.brokers || [];

    // Sync broker status map
    const newIds = new Set(brokerConfigList.map(b => b.id));
    for (const oldId of brokerStatusMap.keys()) {
      if (!newIds.has(oldId)) brokerStatusMap.delete(oldId);
    }
    for (const b of brokerConfigList) {
      if (!brokerStatusMap.has(b.id)) {
        brokerStatusMap.set(b.id, { name: b.name || b.host, status: 'connecting' });
      } else {
        brokerStatusMap.get(b.id).name = b.name || b.host;
      }
    }

    connectionManager.updateBrokers(newConfig.brokers || []);
    deviceRegistry.syncFromAppConfig(newConfig);
    eventBus.emit('config:updated', newConfig);

    updateForegroundNotification();
  });

  eventBus.on('broker:connected',    (id) => setBrokerStatus(id, 'connected'));
  eventBus.on('broker:disconnected', (id) => setBrokerStatus(id, 'offline'));
  eventBus.on('broker:error',        (id) => setBrokerStatus(id, 'error'));
  eventBus.on('broker:reconnecting', (id) => setBrokerStatus(id, 'reconnecting'));

  historyLogger.initialize();
};

export default {
  initialize(config) {
    if (isCoreInitialized) return;
    console.log('[CoreServices] Initializing with initial configuration:', config);

    if (Capacitor.isNativePlatform()) {
      console.log('[CoreServices] Native platform — starting Foreground Service.');

      // Importance.Min = 1  →  fully silent, collapsed, no sound/vibration
      ForegroundService.createNotificationChannel({
        id: 'edwic_bg_service',
        name: 'Фонова синхронізація',
        description: 'Підтримує зв\'язок з MQTT брокером у фоновому режимі',
        importance: 1,
      }).then(() => {
        return ForegroundService.startForegroundService(
          NOTIF_OPTIONS('Запуск...')
        );
      }).then(() => {
        isForegroundServiceStarted = true;
        // Now that service is started, push the real broker status
        updateForegroundNotification();
      }).catch(err => {
        console.error('[ForegroundService] Failed to start:', err);
      });
    }

    setupEventListeners();

    // Fire initial config which triggers broker connections and status tracking
    eventBus.emit('config:saved', config);

    isCoreInitialized = true;
    console.log('[CoreServices] Initialization complete.');
  },
};