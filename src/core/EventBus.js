// backend/src/core/EventBus.js
import EventEmitter from 'events'; // <-- Змінено

class EventBus {
    constructor() {
        this.emitter = new EventEmitter();
    }

    emit(eventName, ...args) {
        return this.emitter.emit(eventName, ...args);
    }

    on(eventName, listener) {
        return this.emitter.on(eventName, listener);
    }

    off(eventName, listener) {
        return this.emitter.off(eventName, listener);
    }
}

// Експортуємо як синглтон, оскільки це глобальна шина подій
export default new EventBus(); // Змінено на default export
