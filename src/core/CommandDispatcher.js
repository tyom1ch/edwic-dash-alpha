// src/core/CommandDispatcher.js
import connectionManager from './ConnectionManager';
import deviceRegistry from './DeviceRegistry';
import { getWidgetById } from './widgetRegistry';

class CommandDispatcher {
  dispatch({ entityId, value, commandKey = 'default' }) {
    const componentConfig = deviceRegistry.getEntity(entityId);
    if (!componentConfig) {
      console.error(`[CommandDispatcher] Component with ID "${entityId}" not found.`);
      return;
    }

    const widgetDef = getWidgetById(componentConfig.type);
    if (!widgetDef?.getCommandMappings) {
      console.error(`[CommandDispatcher] No command mappings found for widget type "${componentConfig.type}".`);
      return;
    }

    const commandMappings = widgetDef.getCommandMappings(componentConfig);
    
    // 1. Отримуємо визначення команди з реєстру.
    // Для 'default' у віджеті 'switch' це буде просто рядок-топік.
    // Для 'set_brightness' у 'light' це буде об'єкт { topic: '...', transformer: ... }.
    const commandDefinition = commandMappings[commandKey] || commandMappings['default'];

    if (!commandDefinition) {
      console.error(`[CommandDispatcher] No command definition found for entity "${entityId}" with commandKey "${commandKey}".`);
      return;
    }

    // 2. Визначаємо топік та payload, виходячи з типу commandDefinition.
    let topic;
    let payload;

    if (typeof commandDefinition === 'string') {
      // Стандартний випадок (як для 'switch'): commandDefinition - це просто топік.
      topic = commandDefinition;
      payload = String(value);
    } else if (typeof commandDefinition === 'object' && commandDefinition.topic) {
      // Новий випадок (для 'light'): commandDefinition - це об'єкт.
      topic = commandDefinition.topic;
      
      // Перевіряємо, чи є функція-трансформер.
      if (typeof commandDefinition.transformer === 'function') {
        // Якщо є, використовуємо її для перетворення значення.
        payload = String(commandDefinition.transformer(value));
      } else {
        // Якщо немає, просто перетворюємо значення на рядок.
        payload = String(value);
      }
    } else {
      console.error(`[CommandDispatcher] Invalid command definition for entity "${entityId}" and commandKey "${commandKey}".`);
      return;
    }

    if (!topic) {
        console.error(`[CommandDispatcher] Command topic is missing for entity "${entityId}".`);
        return;
    }

    // Відправляємо команду.
    console.log(`[CommandDispatcher] Dispatching to broker '${componentConfig.brokerId}'. Topic: '${topic}', Payload: '${payload}'`);
    connectionManager.publishToTopic(
      componentConfig.brokerId,
      topic,
      payload
    );
  }
}

const commandDispatcher = new CommandDispatcher();
export default commandDispatcher;