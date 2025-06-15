// src/core/CommandDispatcher.js
import connectionManager from './ConnectionManager';
import deviceRegistry from './DeviceRegistry';

class CommandDispatcher {
  /**
   * Відправляє команду для певної сутності.
   * @param {object} command - Об'єкт команди.
   * @param {string} command.entityId - ID сутності, якій відправляється команда.
   * @param {any} command.value - Нове значення, яке потрібно відправити.
   */
  dispatch(command) {
    const { entityId, value } = command;

    if (!entityId) {
      console.error("[CommandDispatcher] Cannot dispatch command: entityId is missing.");
      return;
    }

    // 1. Отримуємо повну конфігурацію сутності з реєстру.
    const entity = deviceRegistry.getEntity(entityId);

    if (!entity) {
      console.error(`[CommandDispatcher] Cannot dispatch command: Entity with id "${entityId}" not found.`);
      return;
    }

    // 2. Перевіряємо, чи є у сутності топік для команд.
    const { command_topic, brokerId } = entity;
    if (!command_topic) {
      console.error(`[CommandDispatcher] Cannot dispatch command: Entity "${entityId}" has no 'command_topic' configured.`);
      return;
    }

    // 3. Відправляємо повідомлення через ConnectionManager.
    console.log(`[CommandDispatcher] Dispatching to broker "${brokerId}", topic "${command_topic}", value: "${value}"`);
    connectionManager.publishToTopic(brokerId, command_topic, String(value));
  }
}

// Експортуємо єдиний екземпляр
export default new CommandDispatcher();