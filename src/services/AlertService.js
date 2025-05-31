// frontend/src/services/AlertService.js
import eventBus from '../core/EventBus';         // <-- Змінено
import deviceRegistry from '../core/DeviceRegistry'; // <-- Змінено

class AlertService {
    constructor() {
        this.alertRules = [];
        this.activeAlerts = new Map();
        this.setupListeners();
        console.log("[AlertService] Initialized (Placeholder).");
    }
    setupListeners() {
        eventBus.on('entity:update', this.handleEntityUpdate.bind(this));
    }
    loadRules(rules) { this.alertRules = rules; console.log(`[AlertService] Loaded ${this.alertRules.length} rules.`); }
    handleEntityUpdate(entity) { /* ... */ }
    evaluateRule(rule, entity) { return false; /* ... */ }
    getActiveAlerts() { return Array.from(this.activeAlerts.values()); }
}
export default new AlertService();
