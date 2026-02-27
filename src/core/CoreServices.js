// src/core/CoreServices.js
import connectionManager from './ConnectionManager';
import deviceRegistry from './DeviceRegistry';
import eventBus from './EventBus';
import './DiscoveryService'; // Імпортуємо, щоб він почав слухати події
import './AlertService'; // Background rules & push notifications listener
import { Capacitor } from '@capacitor/core';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { LocalNotifications } from '@capacitor/local-notifications';

let isCoreInitialized = false;

// Ця функція налаштовує реакцію сервісів на майбутні зміни конфігурації
const setupEventListeners = () => {
  eventBus.on("config:saved", (newConfig) => {
    console.log("[CoreServices] Detected config change, synchronizing services...");
    
    // 1. Оновлюємо ConnectionManager новим списком брокерів
    connectionManager.updateBrokers(newConfig.brokers || []);
    
    // 2. Синхронізуємо DeviceRegistry зі списком компонентів та їх підписками
    deviceRegistry.syncFromAppConfig(newConfig);
    
    // 3. Сповіщаємо інші сервіси (напр. DiscoveryService) про оновлення
    eventBus.emit("config:updated", newConfig);
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

    if (Capacitor.isNativePlatform()) {
      console.log("[CoreServices] Native platform detected. Initializing Foreground Service and Notifications.");
      
      // Request exact notification layout permissions on modern Android
      LocalNotifications.requestPermissions().then((result) => {
        console.log("[LocalNotifications] Permission result:", result);
      });

      // Keep WebSocket alive in background with an active Foreground Service
      ForegroundService.createNotificationChannel({
        id: 'edwic_bg_service',
        name: 'Фонова синхронізація',
        description: 'Підтримує зв\'язок з MQTT брокером у фоновому режимі',
        importance: 2 // Low importance
      }).then(() => {
        ForegroundService.startForegroundService({
          id: 1993, // Unique notification ID
          title: 'Edwic Dashboard',
          body: 'Синхронізація даних',
          smallIcon: 'ic_launcher_background', // Fallback to app's icon
          silent: true, // Do not play a sound when the background runner starts
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