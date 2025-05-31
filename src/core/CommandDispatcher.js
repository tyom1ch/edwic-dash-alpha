// frontend/src/core/CommandDispatcher.js
import connectionManager from './ConnectionManager'; // <-- Змінено
import deviceRegistry from './DeviceRegistry';       // <-- Змінено

class CommandDispatcher {
    constructor() { /* Dependencies are available via require */ }
    async dispatch(command) { /* ... */ }
}
export default new CommandDispatcher();
