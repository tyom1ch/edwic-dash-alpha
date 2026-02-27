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
import { App } from '@capacitor/app';

let isCoreInitialized = false;

// Додаємо змінну для зберігання поточного стану брокерів для нотифікацій
let currentBrokersStatus = {};
let appUptimeSeconds = 0;

const formatUptime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Функція для оновлення фонової нотифікації
const updateBackgroundNotification = async () => {
  if (!Capacitor.isNativePlatform()) return;

  const brokersInfo = Object.values(currentBrokersStatus);
  let brokersText = 'Немає налаштованих брокерів';
  
  if (brokersInfo.length > 0) {
    brokersText = brokersInfo.map(b => `${b.name || b.id}: ${b.connected ? '✅' : '❌'}`).join('\n');
  }

  const statusText = `Час роботи: ${formatUptime(appUptimeSeconds)}\n${brokersText}`;

  try {
    await ForegroundService.updateForegroundService({
      id: 1993,
      title: 'Синхронізація...',
      body: statusText,
      smallIcon: 'ic_notification', // Changed to standard icon to prevent resource crashes
      silent: true,
      notificationChannelId: 'edwic_bg_sync_v2'
    });
  } catch (err) {
    console.error("[ForegroundService] Failed to update:", err);
  }
};

// Ця функція налаштовує реакцію сервісів на майбутні зміни конфігурації
const setupEventListeners = () => {
  eventBus.on("config:saved", (newConfig) => {
    console.log("[CoreServices] Detected config change, synchronizing services...");
    
    // 1. Оновлюємо ConnectionManager новим списком брокерів
    connectionManager.updateBrokers(newConfig.brokers || []);
    
    // Оновлюємо внутрішній стан для нотифікації
    const currentStatusIds = Object.keys(currentBrokersStatus);
    const newConfigIds = (newConfig.brokers || []).map(b => b.id);
    
    // Видаляємо старі
    currentStatusIds.forEach(id => {
      if (!newConfigIds.includes(id)) {
        delete currentBrokersStatus[id];
      }
    });

    // Додаємо нові (за замовчуванням disconnected) або оновлюємо існуючі
    (newConfig.brokers || []).forEach(b => {
      if (!currentBrokersStatus[b.id]) {
        currentBrokersStatus[b.id] = { id: b.id, name: b.name, connected: false };
      } else {
        currentBrokersStatus[b.id].name = b.name;
      }
    });

    updateBackgroundNotification();

    // 2. Синхронізуємо DeviceRegistry зі списком компонентів та їх підписками
    deviceRegistry.syncFromAppConfig(newConfig);
    
    // 3. Сповіщаємо інші сервіси (напр. DiscoveryService) про оновлення
    eventBus.emit("config:updated", newConfig);
  });

  // Слухаємо події підключення/відключення брокерів для оновлення нотифікації
  eventBus.on("broker:connected", (id) => {
    if (currentBrokersStatus[id]) {
        currentBrokersStatus[id].connected = true;
        updateBackgroundNotification();
    }
  });

  eventBus.on("broker:disconnected", (id) => {
    if (currentBrokersStatus[id]) {
        currentBrokersStatus[id].connected = false;
        updateBackgroundNotification();
    }
  });

  eventBus.on("broker:error", (id) => {
     if (currentBrokersStatus[id]) {
        currentBrokersStatus[id].connected = false;
        updateBackgroundNotification();
     }
  });
  
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

    // Ініціалізуємо поточний стан брокерів
    (config.brokers || []).forEach(b => {
      currentBrokersStatus[b.id] = { id: b.id, name: b.name, connected: false };
    });

    if (Capacitor.isNativePlatform()) {
      console.log("[CoreServices] Native platform detected. Initializing Foreground Service and Notifications.");
      
      // We MUST execute this asynchronously to avoid blocking the main thread,
      // but we MUST wait for the permission dialog to close before starting
      // the ForegroundService, otherwise Android 12+ will throw 
      // ForegroundServiceStartNotAllowedException and crash the app immediately.
      (async () => {
        try {
          const result = await LocalNotifications.requestPermissions();
          console.log("[LocalNotifications] Permission result:", result);

          if (result.display !== 'granted') {
            console.warn("[LocalNotifications] Permissions not granted, skipping Foreground Service.");
            return;
          }
          
          await ForegroundService.createNotificationChannel({
            id: 'edwic_bg_sync_v2', // New channel for silent/min importance
            name: 'Фонова синхронізація',
            description: 'Синхронізація з MQTT брокерами',
            importance: 1 // Importance.Min - silent, no vibration, collapsed in status bar
          });
          
          const startServices = async () => {
            let brokersText = 'Немає налаштованих брокерів';
            if (config.brokers && config.brokers.length > 0) {
              brokersText = config.brokers.map(b => `${b.name || b.id}: ❌`).join('\n');
            }
            const initialBodyText = `Час роботи: 00:00:00\n${brokersText}`;

            await ForegroundService.startForegroundService({
              id: 1993, // Unique notification ID
              title: 'Синхронізація...',
              body: initialBodyText,
              smallIcon: 'ic_notification', // Changed to standard name we'll ensure exists
              silent: true, // Do not play a sound when the background runner starts
              notificationChannelId: 'edwic_bg_sync_v2'
            });
            
            console.log("[ForegroundService] Started successfully.");

            setInterval(() => {
              appUptimeSeconds++;
              updateBackgroundNotification();
            }, 1000);
          };

          const state = await App.getState();
          if (state.isActive) {
            // Невеличка затримка для завершення UI transitions
            setTimeout(async () => {
              await startServices();
            }, 500);
          } else {
            console.log("[ForegroundService] App is not active yet, waiting for appStateChange...");
            const listener = await App.addListener('appStateChange', async (newState) => {
              if (newState.isActive) {
                console.log("[ForegroundService] App became active, starting services after delay.");
                listener.remove();
                
                // Додаткова затримка дає Activity час повністю відновитися
                // Це виправляє ForegroundServiceDidNotStartInTimeException
                setTimeout(async () => {
                  try {
                    await startServices();
                  } catch (e) {
                    console.error("[ForegroundService] Delayed start failed:", e);
                  }
                }, 500);
              }
            });
          }
        } catch (err) {
          console.error("[ForegroundService / Notifications] Failed to initialize:", err);
        }
      })();
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