// frontend/src/core/DeviceRegistry.js
import eventBus from './EventBus';             // <-- Змінено
import connectionManager from './ConnectionManager'; // <-- Змінено

class DeviceRegistry {
    constructor() {
        this.devices = new Map();
        this.entities = new Map();
        this.setupListeners();
    }
    setupListeners() { /* ... */ }
    syncFromAppConfig(appConfig) { /* ... */ }
    handleMqttRawMessage(brokerId, topic, messageBuffer) { /* ... */ }
    updateEntityValue(entityId, newValue) { /* ... */ }
    parseMqttPayload(messageBuffer, type) { /* ... */ }
    getEntity(entityId) { return this.entities.get(entityId); }
    getAllEntities() { return Array.from(this.entities.values()); }
    getAllDevices() { return Array.from(this.devices.values()); }
}
export default new DeviceRegistry();
