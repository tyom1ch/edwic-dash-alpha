// src/core/DeviceRegistry.js
import eventBus from './EventBus';
import connectionManager from './ConnectionManager';

class DeviceRegistry {
    constructor() {
        // Map для зберігання повних об'єктів сутностей. Ключ - entityId.
        this.entities = new Map();
        
        // Map для швидкого пошуку entityId за топіком. Ключ - topic, значення - entityId.
        this.topicToEntityIdMap = new Map();

        // Ініціалізуємо слухачів одразу при створенні об'єкта.
        this.setupListeners();
        console.log("[DeviceRegistry] Initialized and listeners are set up.");
    }

    /**
     * Налаштовує слухачів на глобальній шині подій.
     */
    setupListeners() {
        // Слухаємо сирі MQTT-повідомлення від ConnectionManager.
        eventBus.on('mqtt:raw_message', this.handleMqttRawMessage.bind(this));
    }

    /**
     * Синхронізує стан реєстру з повною конфігурацією додатку.
     * Цей метод є ключовим. Він будує внутрішню модель даних і робить підписки.
     * @param {object} appConfig - Повний об'єкт appConfig з useLocalStorage.
     */
    syncFromAppConfig(appConfig) {
        console.log("[DeviceRegistry] Starting sync from appConfig...");
        
        // 1. Очищуємо старі дані, щоб уникнути дублікатів.
        this.entities.clear();
        this.topicToEntityIdMap.clear();
        
        // TODO: В майбутньому тут треба буде відписуватись від старих топіків.

        if (!appConfig || !appConfig.dashboards) {
            console.warn("[DeviceRegistry] No dashboards found in appConfig to sync.");
            return;
        }

        // 2. Обходимо всі дашборди та всі їхні компоненти.
        Object.values(appConfig.dashboards).forEach(dashboard => {
            if (dashboard && Array.isArray(dashboard.components)) {
                dashboard.components.forEach(component => {
                    // Зберігаємо повний об'єкт компонента/сутності.
                    this.entities.set(component.id, {
                        ...component,
                        value: null, // Початкове значення
                        last_updated: null,
                    });

                    // 3. Якщо компонент має state_topic, робимо дві важливі речі:
                    if (component.state_topic) {
                        // а) Створюємо карту для швидкого пошуку сутності за топіком.
                        this.topicToEntityIdMap.set(component.state_topic, component.id);

                        // б) Кажемо ConnectionManager підписатися на цей топік.
                        console.log(`[DeviceRegistry] Requesting subscription to topic: "${component.state_topic}" for broker: "${component.brokerId}"`);
                        connectionManager.subscribeToTopic(component.brokerId, component.state_topic);
                    }
                });
            }
        });

        console.log(`[DeviceRegistry] Sync complete. Total entities: ${this.entities.size}. Topic mappings: ${this.topicToEntityIdMap.size}`);
        console.log("[DeviceRegistry] Current entity map:", this.entities);
    }

      /**
     * Обробляє сире MQTT-повідомлення, що надійшло на EventBus.
     * @param {string} brokerId - ID брокера, з якого прийшло повідомлення.
     * @param {string} topic - Топік повідомлення.
     * @param {Buffer} messageBuffer - Вміст повідомлення у вигляді Buffer.
     */
    handleMqttRawMessage(brokerId, topic, messageBuffer) {
        // --- РОЗШИРЕНЕ ЛОГУВАННЯ ДЛЯ НАЛАГОДЖЕННЯ ---
        console.log(`[DeviceRegistry] handleMqttRawMessage: Received message on topic "${topic}"`);

        // 1. Шукаємо, чи є у нас сутність, прив'язана до цього топіка.
        const entityId = this.topicToEntityIdMap.get(topic);
        
        // Логуємо результат пошуку
        if (entityId) {
            console.log(`[DeviceRegistry] SUCCESS: Found matching entityId "${entityId}" for topic "${topic}".`);
        } else {
            console.warn(`[DeviceRegistry] WARNING: No entity found for topic "${topic}".`);
            // Виводимо всі відомі топіки, щоб побачити можливу невідповідність (наприклад, слеш на початку)
            console.log('[DeviceRegistry] Known topics in map:', Array.from(this.topicToEntityIdMap.keys()));
            return; // Якщо сутність не знайдено, далі не йдемо
        }

        // 2. Якщо знайшли, отримуємо повний об'єкт сутності.
        const entity = this.entities.get(entityId);
        const newValue = this.parseMqttPayload(messageBuffer, entity.type);
        
        console.log(`[DeviceRegistry] Updating entity "${entityId}". Old value: ${entity.value}, New value: ${newValue}`);

        // 3. Оновлюємо значення та час оновлення.
        entity.value = newValue;
        entity.last_updated = new Date().toISOString();

        // 4. Повідомляємо всю систему про оновлення, відправляючи повний об'єкт сутності.
        console.log(`[DeviceRegistry] Emitting 'entity:update' for entityId "${entityId}"`, entity);
        eventBus.emit('entity:update', { ...entity }); // Важливо! Передаємо копію об'єкта
    }
    /**
     * Парсить payload з буфера в рядок. В майбутньому можна розширити для JSON.
     */
    parseMqttPayload(messageBuffer, type) {
        // Поки що просто перетворюємо в рядок.
        return messageBuffer.toString();
    }

    // --- Методи для доступу до даних ---
    getEntity(entityId) {
        return this.entities.get(entityId);
    }
}

// Експортуємо єдиний екземпляр (синглтон)
export default new DeviceRegistry();