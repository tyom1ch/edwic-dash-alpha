// frontend/src/services/HistoryService.js
// !!! ВСТАНОВИТИ DEXIE: npm install dexie !!!
import Dexie from 'dexie'; // Імпортуємо Dexie
import eventBus from '../core/EventBus'; // Singleton

// Визначаємо схему бази даних IndexedDB
class HistoryDatabase extends Dexie {
    constructor() {
        super('edwic_history_db'); // Назва бази даних
        // Схема версії 1
        this.version(1).stores({
            history: '++id,entityId,timestamp' // id - автоінкремент, entityId та timestamp - індекси
        });
        console.log("[HistoryService] Dexie DB schema defined.");
    }
}

// Створюємо екземпляр бази даних (але вона ще не відкрита)
const dbInstance = new HistoryDatabase();

class HistoryService {
    constructor() {
        this.db = dbInstance; // Присвоюємо екземпляр бази даних
        //setupListeners() викликається після init, щоб db було ініціалізовано
        console.log("[HistoryService] Initialized (constructor).");
    }

    // Метод init, який App.jsx намагається викликати
    async init(influxdbConfig = null) { // Приймає конфігурацію InfluxDB (якщо вона буде)
        try {
            await this.db.open(); // Відкриваємо базу даних IndexedDB
            console.log("[HistoryService] IndexedDB opened successfully.");
            this.setupListeners(); // Тепер можна налаштувати слухачі
        } catch (error) {
            console.error("[HistoryService] Failed to open IndexedDB:", error);
            // Додати логіку для обробки помилки ініціалізації БД
        }

        // Якщо InfluxDB буде використовуватися пізніше, його конфігурація буде тут
        // this.influxdbConfig = influxdbConfig;
        // console.log("[HistoryService] InfluxDB config (if any):", this.influxdbConfig);
    }

    setupListeners() {
        eventBus.on('entity:update', this.handleEntityUpdate.bind(this));
    }

    async handleEntityUpdate(entity) {
        // Зберігаємо тільки числові або булеві значення, які можуть бути на графіках
        if (typeof entity.value === 'number' || typeof entity.value === 'boolean') {
            try {
                // Перевіряємо, чи база даних відкрита
                if (this.db.isOpen()) {
                    await this.db.history.add({
                        entityId: entity.id,
                        value: entity.value,
                        timestamp: entity.lastUpdated,
                    });
                    // console.log(`[HistoryService] Saved history for ${entity.id}: ${entity.value}`);
                } else {
                    console.warn(`[HistoryService] Cannot save history for ${entity.id}: IndexedDB is not open.`);
                }
            } catch (error) {
                console.error(`[HistoryService] Error saving history for ${entity.id}:`, error);
            }
        }
    }

    async queryEntityHistory(entityId, startTime, endTime) {
        if (!this.db.isOpen()) {
            console.warn("[HistoryService] Cannot query history: IndexedDB is not open.");
            return [];
        }
        let query = this.db.history.where('entityId').equals(entityId);

        if (startTime && endTime) {
            query = query.filter(item => item.timestamp >= startTime && item.timestamp <= endTime);
        } else if (startTime) {
            query = query.filter(item => item.timestamp >= startTime);
        } else if (endTime) {
            query = query.filter(item => item.timestamp <= endTime);
        }

        return await query.sortBy('timestamp');
    }

    // Опціонально: метод для очищення старих даних
    async cleanupHistory(daysToKeep) {
        if (!this.db.isOpen()) {
            console.warn("[HistoryService] Cannot cleanup history: IndexedDB is not open.");
            return;
        }
        const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        await this.db.history.where('timestamp').below(cutoff).delete();
        console.log(`[HistoryService] Cleaned up history older than ${daysToKeep} days.`);
    }
}
export default new HistoryService(); // Експортуємо синглтон