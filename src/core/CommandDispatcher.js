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
    const targetTopicKey = commandKey === 'default' 
      ? Object.keys(commandMappings).find(k => k.endsWith('command_topic') || k.endsWith('cmd_t')) || 'default'
      : commandKey;
      
    const targetTopic = commandMappings[targetTopicKey] || commandMappings['default'];

    if (targetTopic) {
      // The key for JSON commands is often 'json_command' or similar.
      const isJsonCommand = targetTopicKey.toLowerCase().includes('json');
      const payload = (isJsonCommand && typeof value === 'object' && value !== null)
        ? JSON.stringify(value)
        : String(value);

      console.log(`[CommandDispatcher] Dispatching to broker '${componentConfig.brokerId}'. Topic: '${targetTopic}', Value: '${payload}'`);
      connectionManager.publishToTopic(
        componentConfig.brokerId,
        targetTopic,
        payload
      );
    } else {
      console.error(`[CommandDispatcher] No command topic found for entity "${entityId}" with commandKey "${commandKey}". Check widgetRegistry.`);
    }
  }
}

const commandDispatcher = new CommandDispatcher();
export default commandDispatcher;