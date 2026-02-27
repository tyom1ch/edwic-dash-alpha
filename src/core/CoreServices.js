// src/core/CoreServices.js
import connectionManager from './ConnectionManager';
import deviceRegistry from './DeviceRegistry';
import eventBus from './EventBus';
import './DiscoveryService'; // Імпортуємо, щоб він почав слухати події
import './AlertService'; // Background rules & push notifications listener
import historyLogger from './HistoryLogger';
import { Capacitor } from '@capacitor/core';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { LocalNotifications } from '@capacitor/local-notifications';

let isCoreInitialized = false;

// ── Internal broker status tracking for notification ─────────────────────────
const brokerStatusMap = new Map(); // brokerId → { name, status }
let brokerConfigList = []; // Current broker config list

const STATUS_LABELS = {
  connected: '✅',
  connecting: '🔄',
  reconnecting: '🔄',
  offline: '❌',
  error: '⚠️',
};

const buildNotificationBody = () => {
  if (brokerStatusMap.size === 0) return 'Немає налаштованих брокерів';
  const lines = [];
  for (const [, info] of brokerStatusMap) {
    const icon = STATUS_LABELS[info.status] || '❓';
    lines.push(`${icon} ${info.name}`);
  }
  return lines.join(' • ');
};

const updateForegroundNotification = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await ForegroundService.startForegroundService({
      id: 1993,
      title: 'EdWic Dashboard',
      body: buildNotificationBody(),
      smallIcon: 'ic_launcher_foreground',
      silent: true,
      notificationChannelId: 'edwic_bg_service',
    });
  } catch (e) {
    // Notification update failed, non-critical
  }
};

const setBrokerStatus = (brokerId, status) => {
  const existing = brokerStatusMap.get(brokerId);
  if (existing) {
    existing.status = status;
  } else {
    // Find name from config
    const cfg = brokerConfigList.find(b => b.id === brokerId);
    brokerStatusMap.set(brokerId, {
      name: cfg ? (cfg.name || cfg.host) : brokerId,
      status,
    });
  }
  updateForegroundNotification();
};

// ── Event listener setup ─────────────────────────────────────────────────────
const setupEventListeners = () => {
  eventBus.on("config:saved", (newConfig) => {
    console.log("[CoreServices] Detected config change, synchronizing services...");
    
    // Update internal broker config reference
    brokerConfigList = newConfig.brokers || [];
    
    // Sync broker status map: remove deleted brokers, add new ones
    const newIds = new Set(brokerConfigList.map(b => b.id));
    for (const oldId of brokerStatusMap.keys()) {
      if (!newIds.has(oldId)) brokerStatusMap.delete(oldId);
    }
    for (const b of brokerConfigList) {
      if (!brokerStatusMap.has(b.id)) {
        brokerStatusMap.set(b.id, { name: b.name || b.host, status: 'connecting' });
      } else {
        // Update name in case it changed
        brokerStatusMap.get(b.id).name = b.name || b.host;
      }
    }
    
    // 1. Оновлюємо ConnectionManager новим списком брокерів
    connectionManager.updateBrokers(newConfig.brokers || []);
    
    // 2. Синхронізуємо DeviceRegistry зі списком компонентів та їх підписками
    deviceRegistry.syncFromAppConfig(newConfig);
    
    // 3. Сповіщаємо інші сервіси (напр. DiscoveryService) про оновлення
    eventBus.emit("config:updated", newConfig);
    
    updateForegroundNotification();
  });
  
  // Listen to broker lifecycle events for notification updates
  eventBus.on('broker:connected', (brokerId) => setBrokerStatus(brokerId, 'connected'));
  eventBus.on('broker:disconnected', (brokerId) => setBrokerStatus(brokerId, 'offline'));
  eventBus.on('broker:error', (brokerId) => setBrokerStatus(brokerId, 'error'));
  eventBus.on('broker:reconnecting', (brokerId) => setBrokerStatus(brokerId, 'reconnecting'));
  
  // Ensure the history logger wakes up and attaches its event listeners
  historyLogger.initialize();
};

export default {
  /**
   * Головна функція ініціалізації. Викликається один раз при старті додатку.
   * @param {object} config - Початкова конфігурація додатку.
   */
  initialize(config) {
    if (isCoreInitialized) {
      return;
    }
    console.log("[CoreServices] Initializing with initial configuration:", config);

    if (Capacitor.isNativePlatform()) {
      console.log("[CoreServices] Native platform detected. Initializing Foreground Service and Notifications.");
      
      // Request exact notification layout permissions on modern Android
      LocalNotifications.requestPermissions().then((result) => {
        console.log("[LocalNotifications] Permission result:", result);
      });

      // Keep WebSocket alive in background with an active Foreground Service
      // Importance 1 = MIN: silent, collapsed, no sound/vibration
      ForegroundService.createNotificationChannel({
        id: 'edwic_bg_service',
        name: 'Фонова синхронізація',
        description: 'Підтримує зв\'язок з MQTT брокером у фоновому режимі',
        importance: 1 // MIN importance — fully silent and collapsed
      }).then(() => {
        ForegroundService.startForegroundService({
          id: 1993,
          title: 'EdWic Dashboard',
          body: 'Запуск синхронізації...',
          smallIcon: 'ic_launcher_foreground',
          silent: true,
          notificationChannelId: 'edwic_bg_service'
        }).catch(err => {
          console.error("[ForegroundService] Failed to start:", err);
        });
      }).catch(err => {
        console.error("[ForegroundService] Failed to create channel:", err);
      });
    }

    // Спочатку налаштовуємо слухачів подій
    setupEventListeners();
    
    // Потім "вистрілюємо" подією 'config:saved' з початковим конфігом.
    // Це змушує всі сервіси синхронізуватися, використовуючи ту ж логіку,
    // що й для динамічних оновлень.
    eventBus.emit("config:saved", config);
    
    isCoreInitialized = true;
    console.log("[CoreServices] Initialization complete.");
  }
};