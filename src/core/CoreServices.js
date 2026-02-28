// src/core/CoreServices.js
import connectionManager from './ConnectionManager';
import deviceRegistry from './DeviceRegistry';
import eventBus from './EventBus';
import './DiscoveryService'; // Імпортуємо, щоб він почав слухати події
import './AlertService'; // Background rules & push notifications listener
import historyLogger from './HistoryLogger';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

// Register native MQTT plugin (only resolves on Android, noop on web)
const NativeMqtt = registerPlugin('NativeMqtt');

let isCoreInitialized = false;
let isNativeMqttStarted = false;

// Додаємо змінну для зберігання поточного стану брокерів для нотифікацій
let currentBrokersStatus = {};

// Ця функція налаштовує реакцію сервісів на майбутні зміни конфігурації
const setupEventListeners = () => {
  eventBus.on("config:saved", async (newConfig) => {
    console.log("[CoreServices] Detected config change, synchronizing services...");
    
    // 1. Оновлюємо ConnectionManager новим списком брокерів
    connectionManager.updateBrokers(newConfig.brokers || []);
    
    // На Android також оновлюємо нативний сервіс
    if (Capacitor.isNativePlatform() && isNativeMqttStarted) {
      NativeMqtt.updateBrokers({ brokers: newConfig.brokers || [] }).catch(e => {
        console.error("[NativeMqtt] Failed to update brokers:", e);
      });
      // Push alert rules to native for background notification evaluation
      NativeMqtt.configureAlerts({ alerts: newConfig.alerts || [] }).catch(e => {
        console.error("[NativeMqtt] Failed to update alerts:", e);
      });
    }

    // Оновлюємо внутрішній стан для UI
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
    
    // 2. Синхронізуємо DeviceRegistry зі списком компонентів та їх підписками
    await deviceRegistry.syncFromAppConfig(newConfig);
    
    // 3. Сповіщаємо інші сервіси (напр. DiscoveryService) про оновлення
    eventBus.emit("config:updated", newConfig);
  });

  // Слухаємо події підключення/відключення брокерів для оновлення UI
  eventBus.on("broker:connected", (id) => {
    if (currentBrokersStatus[id]) {
        currentBrokersStatus[id].connected = true;
    }
  });

  eventBus.on("broker:disconnected", (id) => {
    if (currentBrokersStatus[id]) {
        currentBrokersStatus[id].connected = false;
    }
  });

  eventBus.on("broker:error", (id) => {
     if (currentBrokersStatus[id]) {
        currentBrokersStatus[id].connected = false;
     }
  });
  
  // Ensure the history logger wakes up and attaches its event listeners
  historyLogger.initialize();
};

// Setup native MQTT event listeners (forwarded from Java service to JS)
const setupNativeMqttListeners = () => {
  // Receive messages from native MQTT service
  NativeMqtt.addListener('mqttMessage', (data) => {
    // Forward to the same eventBus that the JS MQTT wrapper uses
    eventBus.emit('mqtt:raw_message', data.brokerId, data.topic, data.payload);
  });

  // Receive broker status changes from native service
  NativeMqtt.addListener('brokerStatus', (data) => {
    const { brokerId, status } = data;
    
    const prevStatus = connectionManager.getConnectionStatus(brokerId);
    if (status === prevStatus) return; // Prevent infinite re-subscription spam
    
    // Оновлюємо статус в ConnectionManager для isConnected()
    connectionManager.updateNativeStatus(brokerId, status);
    
    if (status === 'connected') {
      eventBus.emit('broker:connected', brokerId, currentBrokersStatus[brokerId]);
    } else if (status === 'error') {
      eventBus.emit('broker:error', brokerId, { message: data.message || "Помилка" });
    } else if (status === 'disconnected') {
      eventBus.emit('broker:disconnected', brokerId);
    } else if (status === 'removed') {
      eventBus.emit('broker:removed', brokerId);
    }
  });

  // Receive native alerts fired in background
  NativeMqtt.addListener('alertFired', (data) => {
    // Store in internal IndexedDB
    import('./db').then(({ db }) => {
      db.notifications.put(data).catch(e => console.error("[CoreServices] DB Error:", e));
    });
    // Emit internal event for the UI Menu to reload DB (silent: no snackbar)
    eventBus.emit("app:alert_triggered", { silent: true });
  });

  // When app comes back to foreground, refresh statuses and deliver only latest values
  App.addListener('appStateChange', async (state) => {
    if (state.isActive && isNativeMqttStarted) {
      try {
        eventBus.emit("app:refreshing_start");
        // Refresh broker statuses from native service (only emit if changed)
        const statusResult = await NativeMqtt.getStatus();
        if (statusResult.brokers) {
          const brokers = typeof statusResult.brokers === 'string' 
            ? JSON.parse(statusResult.brokers) 
            : statusResult.brokers;
          Object.entries(brokers).forEach(([brokerId, status]) => {
            const previousStatus = connectionManager.isConnected(brokerId) ? 'connected' : 'disconnected';
            connectionManager.updateNativeStatus(brokerId, status);
            // Only emit if status actually changed to avoid cascading re-renders
            if (status !== previousStatus) {
              if (status === 'connected') {
                eventBus.emit('broker:connected', brokerId, currentBrokersStatus[brokerId]);
              } else {
                eventBus.emit('broker:disconnected', brokerId);
              }
            }
          });
        }

        // Drain buffered messages
        const result = await NativeMqtt.drainBuffer();
        const messages = result.messages || [];
        if (messages.length > 0) {
          console.log(`[NativeMqtt] Drained ${messages.length} msgs, emitting all to eventBus.`);
          messages.forEach(msg => {
            eventBus.emit('mqtt:raw_message', msg.brokerId, msg.topic, msg.payload, { buffered: true });
          });
        }

        // Drain buffered alerts
        const alertsResult = await NativeMqtt.drainAlerts();
        const bufferedAlerts = alertsResult.alerts || [];
        if (bufferedAlerts.length > 0) {
          console.log(`[NativeMqtt] Drained ${bufferedAlerts.length} fired alerts.`);
          const { db } = await import('./db');
          let didAdd = false;
          for (const a of bufferedAlerts) {
            await db.notifications.put(a).catch(e => console.error("[CoreServices] DB Error:", e));
            didAdd = true;
          }
          if (didAdd) {
            eventBus.emit("app:alert_triggered", { silent: true });
          }
        }
      } catch (e) {
        console.error("[NativeMqtt] Error on resume:", e);
      } finally {
        eventBus.emit("app:refreshing_end");
      }
    }
  });
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
    console.log("[CoreServices] Initializing with initial configuration...");

    // Ініціалізуємо поточний стан брокерів
    (config.brokers || []).forEach(b => {
      currentBrokersStatus[b.id] = { id: b.id, name: b.name, connected: false };
    });

    if (Capacitor.isNativePlatform()) {
      console.log("[CoreServices] Native platform detected.");
      
      // Setup native event listeners regardless of autoConnect (so manual starts work)
      setupNativeMqttListeners();

      if (config.autoConnect !== false) {
        console.log("[CoreServices] Starting Native MQTT Service auto-connect...");
        // Start native MQTT service — it runs independently of WebView
        (async () => {
        try {
          // 1. Request notification permission (Android 13+)
          const permResult = await LocalNotifications.requestPermissions();
          console.log("[CoreServices] Notification permission:", permResult.display);
          
          if (permResult.display !== 'granted') {
            console.warn("[CoreServices] Notifications not granted. Service will start but alerts won't show.");
          }

          // 2. Setup native event listeners (REMOVED DUPLICATE CALL)
          // Permissions granted, continuing setup...

          const state = await App.getState();
          
          const startNativeService = async () => {
            try {
              await NativeMqtt.startService({ 
                brokers: config.brokers || [],
                alerts: config.alerts || []
              });
              isNativeMqttStarted = true;
              console.log("[NativeMqtt] Native MQTT service started successfully. Waiting 1.5s for bind...");
              
              // 3. Sync status after service binds (service may already be connected from background)
              setTimeout(async () => {
                try {
                  // Emit config:saved AFTER native service fully binds to completely avoid "Service not running" race condition.
                  eventBus.emit("config:saved", config);

                  eventBus.emit("app:refreshing_start");
                  const statusResult = await NativeMqtt.getStatus();
                  if (statusResult.brokers) {
                    const brokers = typeof statusResult.brokers === 'string' 
                      ? JSON.parse(statusResult.brokers) 
                      : statusResult.brokers;
                    Object.entries(brokers).forEach(([brokerId, status]) => {
                      connectionManager.updateNativeStatus(brokerId, status);
                      if (status === 'connected') {
                        eventBus.emit('broker:connected', brokerId);
                      }
                    });
                    console.log("[NativeMqtt] Post-start status sync:", JSON.stringify(brokers));
                  }
                } catch (syncErr) {
                  console.warn("[NativeMqtt] Status sync failed:", syncErr);
                } finally {
                  eventBus.emit("app:refreshing_end");
                }
              }, 1500); // Wait for service binding + broker connection

              // 4. Request battery optimization exemption (background mode)
              try {
                await NativeMqtt.requestIgnoreBatteryOptimizations();
                console.log("[NativeMqtt] Battery optimization request sent.");
              } catch (batErr) {
                console.warn("[NativeMqtt] Battery optimization request failed:", batErr);
              }
            } catch (e) {
              console.error("[NativeMqtt] Failed to start native service:", e);
            }
          };

          if (state.isActive) {
            // Невеличка затримка для завершення UI transitions
            setTimeout(startNativeService, 500);
          } else {
            console.log("[NativeMqtt] App is not active yet, waiting for appStateChange...");
            const listener = await App.addListener('appStateChange', async (newState) => {
              if (newState.isActive) {
                console.log("[NativeMqtt] App became active, starting native service...");
                listener.remove();
                setTimeout(startNativeService, 500);
              }
            });
          }
        } catch (err) {
          console.error("[NativeMqtt] Failed to initialize:", err);
        }
      })();
      } else {
        console.log("[CoreServices] autoConnect is disabled for native. Service not started.");
      }
    }

    // Спочатку налаштовуємо слухачів подій
    setupEventListeners();
    
    if (!Capacitor.isNativePlatform()) {
      // Для WEB просто пускаємо процес
      if (config.autoConnect !== false) {
        eventBus.emit("config:saved", config);
      }
    } else if (config.autoConnect === false) {
      // Якщо автопідключення вимкнено, UI має знати поточний конфіг
      eventBus.emit("config:saved", config);
    }
    
    isCoreInitialized = true;
    console.log("[CoreServices] Initialization complete.");
  }
};