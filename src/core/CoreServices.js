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
  eventBus.on("config:saved", (newConfig) => {
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
    deviceRegistry.syncFromAppConfig(newConfig);
    
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

  // When app comes back to foreground, drain buffered messages and refresh statuses
  App.addListener('appStateChange', async (state) => {
    if (state.isActive && isNativeMqttStarted) {
      try {
        // Refresh broker statuses from native service
        const statusResult = await NativeMqtt.getStatus();
        if (statusResult.brokers) {
          const brokers = typeof statusResult.brokers === 'string' 
            ? JSON.parse(statusResult.brokers) 
            : statusResult.brokers;
          Object.entries(brokers).forEach(([brokerId, status]) => {
            connectionManager.updateNativeStatus(brokerId, status);
            if (status === 'connected') {
              eventBus.emit('broker:connected', brokerId, currentBrokersStatus[brokerId]);
            } else {
              eventBus.emit('broker:disconnected', brokerId);
            }
          });
        }

        // Drain buffered messages
        const result = await NativeMqtt.drainBuffer();
        const messages = result.messages || [];
        if (messages.length > 0) {
          console.log(`[NativeMqtt] Draining ${messages.length} buffered messages from background.`);
          messages.forEach(msg => {
            eventBus.emit('mqtt:raw_message', msg.brokerId, msg.topic, msg.payload);
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
    console.log("[CoreServices] Initializing with initial configuration:", config);

    // Ініціалізуємо поточний стан брокерів
    (config.brokers || []).forEach(b => {
      currentBrokersStatus[b.id] = { id: b.id, name: b.name, connected: false };
    });

    if (Capacitor.isNativePlatform()) {
      console.log("[CoreServices] Native platform detected. Starting Native MQTT Service.");
      
      // Start native MQTT service — it runs independently of WebView
      (async () => {
        try {
          // 1. Request notification permission (Android 13+)
          const permResult = await LocalNotifications.requestPermissions();
          console.log("[CoreServices] Notification permission:", permResult.display);
          
          if (permResult.display !== 'granted') {
            console.warn("[CoreServices] Notifications not granted. Service will start but alerts won't show.");
          }

          // 2. Setup native event listeners
          setupNativeMqttListeners();

          const state = await App.getState();
          
          const startNativeService = async () => {
            try {
              await NativeMqtt.startService({ 
                brokers: config.brokers || [],
                alerts: config.alerts || []
              });
              isNativeMqttStarted = true;
              console.log("[NativeMqtt] Native MQTT service started successfully.");

              // 3. Request battery optimization exemption (background mode)
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