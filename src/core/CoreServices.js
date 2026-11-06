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
let nativeListenersSetup = false;
let latestConfig = { brokers: [], alerts: [], dashboards: {} };
let appliedBrokerKey = null;
let appliedAlertKey = null;
let appliedCardsKey = null;

let currentBrokersStatus = {};

const connectionKey = (brokers) => JSON.stringify((brokers || []).map((broker) => ({
  id: broker.id,
  name: broker.name,
  host: broker.host,
  port: broker.port,
  username: broker.username,
  password: broker.password,
  secure: !!broker.secure,
  basepath: broker.basepath || '',
  protocol: broker.protocol || '',
  clientId: broker.clientId || '',
  path: broker.path || '',
})));

const alertKey = (alerts) => JSON.stringify(alerts || []);

const cardsKey = (config) => {
  const cards = [];
  Object.values(config.dashboards || {}).forEach((dashboard) => {
    (dashboard.sections || []).forEach((section) => {
      (section.cards || []).forEach((card) => cards.push(card));
    });
  });
  return JSON.stringify(cards);
};

const syncBrokerStatusIndex = (brokers) => {
  const ids = new Set(brokers.map((broker) => broker.id));
  Object.keys(currentBrokersStatus).forEach((id) => {
    if (!ids.has(id)) delete currentBrokersStatus[id];
  });
  brokers.forEach((broker) => {
    const current = currentBrokersStatus[broker.id];
    if (!current) {
      currentBrokersStatus[broker.id] = { id: broker.id, name: broker.name, connected: false };
    } else {
      current.name = broker.name;
    }
  });
};

const setupEventListeners = () => {
  eventBus.on("config:saved", async (newConfig) => {
    latestConfig = newConfig;
    const nextBrokerKey = connectionKey(newConfig.brokers);
    const nextAlertKey = alertKey(newConfig.alerts);
    const brokersChanged = nextBrokerKey !== appliedBrokerKey;
    const alertsChanged = nextAlertKey !== appliedAlertKey;

    if (brokersChanged) {
      connectionManager.updateBrokers(newConfig.brokers || []);
      syncBrokerStatusIndex(newConfig.brokers || []);
      appliedBrokerKey = nextBrokerKey;
    }

    if (Capacitor.isNativePlatform() && isNativeMqttStarted) {
      if (brokersChanged) {
        NativeMqtt.updateBrokers({ brokers: newConfig.brokers || [] }).catch((e) => {
          console.error("[NativeMqtt] Failed to update brokers:", e);
        });
      }
      if (alertsChanged) {
        NativeMqtt.configureAlerts({ alerts: newConfig.alerts || [] }).catch((e) => {
          console.error("[NativeMqtt] Failed to update alerts:", e);
        });
      }
    }
    if (alertsChanged) appliedAlertKey = nextAlertKey;

    const nextCardsKey = cardsKey(newConfig);
    if (nextCardsKey !== appliedCardsKey) {
      await deviceRegistry.syncFromAppConfig(newConfig);
      appliedCardsKey = nextCardsKey;
    }
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
  if (nativeListenersSetup) {
    console.warn("[CoreServices] setupNativeMqttListeners called twice — skipping.");
    return;
  }
  nativeListenersSetup = true;
  // Receive messages from native MQTT service
  NativeMqtt.addListener('mqttMessage', (data) => {
    // Forward to the same eventBus that the JS MQTT wrapper uses
    eventBus.emit('mqtt:raw_message', data.brokerId, data.topic, data.payload);
  });

  // Receive broker status changes from native service
  NativeMqtt.addListener('brokerStatus', (data) => {
    const { brokerId, status } = data;
    
    // Оновлюємо статус в ConnectionManager для isConnected()
    connectionManager.updateNativeStatus(brokerId, status);
    
    if (status === 'connected') {
      eventBus.emit('broker:connected', brokerId, currentBrokersStatus[brokerId]);
    } else if (status === 'disconnected' || status === 'error') {
      eventBus.emit('broker:disconnected', brokerId);
    } else if (status === 'removed') {
      eventBus.emit('broker:removed', brokerId);
    }
  });

  // When the app returns, refresh broker statuses. The service pushes the latest values.
  App.addListener('appStateChange', async (state) => {
    if (state.isActive && isNativeMqttStarted) {
      try {
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

      } catch (e) {
        console.error("[NativeMqtt] Error on resume:", e);
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
    latestConfig = config;
    console.log(`[CoreServices] Initializing. brokers=${(config.brokers || []).length}`);

    // Ініціалізуємо поточний стан брокерів
    (config.brokers || []).forEach(b => {
      currentBrokersStatus[b.id] = { id: b.id, name: b.name, connected: false };
    });

    if (Capacitor.isNativePlatform()) {
      console.log("[CoreServices] Native platform detected.");

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

          // 2. Setup native event listeners (guard inside prevents double-registration)
          setupNativeMqttListeners();

          const state = await App.getState();
          
          const startNativeService = async () => {
            try {
              await NativeMqtt.startService({
                brokers: latestConfig.brokers || [],
                alerts: latestConfig.alerts || [],
              });
              isNativeMqttStarted = true;
              console.log("[NativeMqtt] Native MQTT service started successfully.");

              // 3. Sync status after service binds (service may already be connected from background)
              setTimeout(async () => {
                try {
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
                    console.log("[NativeMqtt] Post-start status sync:", brokers);
                  }
                } catch (syncErr) {
                  console.warn("[NativeMqtt] Status sync failed:", syncErr);
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
    historyLogger.sync(config);

    // Потім "вистрілюємо" подією 'config:saved' з початковим конфігом.
    // Це змушує всі сервіси синхронізуватися, використовуючи ту ж логіку,
    // що й для динамічних оновлень.
    if (config.autoConnect !== false) {
      eventBus.emit("config:saved", config);
    } else {
      console.log("[CoreServices] autoConnect is disabled. Initial connection skipped.");
    }
    
    isCoreInitialized = true;
    console.log("[CoreServices] Initialization complete.");
  }
};