// src/core/widgetRegistry.js

import SwitchComponent from "../components/widgets/SwitchComponent";
import SensorComponent from "../components/widgets/SensorComponent";
import ClimateComponent from "../components/widgets/ClimateComponent";

/**
 * Допоміжна функція для розкриття базового топіка `~`.
 * Ця логіка тепер знаходиться тут, оскільки адаптер видалено.
 * @param {string | undefined} topic - Шлях до топіка.
 * @param {string | undefined} baseTopic - Базовий топік (`~`).
 * @returns {string | undefined} - Повний шлях до топіка.
 */
const resolveTopic = (topic, baseTopic) => {
  if (typeof topic === 'string' && topic.startsWith('~/') && baseTopic) {
    return topic.replace('~', baseTopic);
  }
  return topic;
};

export const WIDGET_REGISTRY = [
  {
    type: "sensor",
    label: "Сенсор (тільки читання)",
    component: SensorComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1 },
    topicFields: ["stat_t", "state_topic", "unit_of_meas", "unit_of_measurement"],
    getTopicMappings: (config) => ({
      value: config.state_topic || config.stat_t
    }),
  },
  {
    type: "switch",
    label: "Перемикач (ON/OFF)",
    component: SwitchComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1 },
    topicFields: ["stat_t", "state_topic", "cmd_t", "command_topic", "pl_on", "payload_on", "pl_off", "payload_off"],
    getTopicMappings: (config) => ({ 
      value: resolveTopic(config.state_topic || config.stat_t, config['~'])
    }),
    getCommandMappings: (config) => ({
      default: resolveTopic(config.command_topic || config.cmd_t, config['~'])
    }),
  },
  {
    // --- ЄДИНИЙ УНІВЕРСАЛЬНИЙ ВІДЖЕТ ДЛЯ КЛІМАТУ ---
    type: "climate",
    label: "Клімат-контроль (Універсальний)",
    component: ClimateComponent,
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2, maxH: 2, maxW: 2 },
    // Список ВСІХ можливих полів з усіх форматів (HA та ваш внутрішній)
    topicFields: [
      // Поточна температура
      "curr_temp_t", "current_temperature_topic",
      // Стан режиму (mode)
      "mode_stat_t", "mode_state_topic",
      // Стан дії (action)
      "act_t", "action_topic",
      // Команда для режиму (mode)
      "mode_cmd_t", "mode_command_topic",
      // --- Режим однієї температури ---
      "temp_stat_t", "temperature_state_topic",
      "temp_cmd_t", "temperature_command_topic",
      // --- Режим діапазону температур ---
      "temp_lo_stat_t", "temperature_low_state_topic",
      "temp_hi_stat_t", "temperature_high_state_topic",
      "temp_lo_cmd_t", "temperature_low_command_topic",
      "temp_hi_cmd_t", "temperature_high_command_topic",
      // --- Режим пресетів ---
      "pr_mode_stat_t", "preset_mode_state_topic",
      "pr_mode_cmd_t", "preset_mode_command_topic",
      // Списки режимів (не топіки, а дані)
      "modes", "preset_modes",
    ],
    // "Розумний" мапінг, який сам визначає, які поля використовувати
    getTopicMappings: (config) => {
      const baseTopic = config['~'];
      const mappings = {
        // Використовуємо `||` для вибору першого знайденого поля
        current_temperature: resolveTopic(config.current_temperature_topic || config.curr_temp_t, baseTopic),
        mode: resolveTopic(config.mode_state_topic || config.mode_stat_t, baseTopic),
        action: resolveTopic(config.action_topic || config.act_t, baseTopic),
        preset_mode: resolveTopic(config.preset_mode_state_topic || config.pr_mode_stat_t, baseTopic),
        // Це не топіки, а просто масиви, тому `resolveTopic` не потрібен
        presets: config.preset_modes,
        modes: config.modes,
      };

      // Динамічно визначаємо, чи це режим діапазону
      const isRange = (config.temperature_low_state_topic || config.temp_lo_stat_t) && (config.temperature_high_state_topic || config.temp_hi_stat_t);

      if (isRange) {
        mappings.temperature_low = resolveTopic(config.temperature_low_state_topic || config.temp_lo_stat_t, baseTopic);
        mappings.temperature_high = resolveTopic(config.temperature_high_state_topic || config.temp_hi_stat_t, baseTopic);
      } else {
        mappings.temperature = resolveTopic(config.temperature_state_topic || config.temp_stat_t, baseTopic);
      }

      return mappings;
    },
    // "Розумний" мапінг команд
    getCommandMappings: (config) => {
      const baseTopic = config['~'];
      const commands = {
        set_mode: resolveTopic(config.mode_command_topic || config.mode_cmd_t, baseTopic),
        set_preset_mode: resolveTopic(config.preset_mode_command_topic || config.pr_mode_cmd_t, baseTopic),
      };

      // Динамічно визначаємо, які команди для температури доступні
      const hasRangeCommands = (config.temperature_low_command_topic || config.temp_lo_cmd_t) && (config.temperature_high_command_topic || config.temp_hi_cmd_t);

      if (hasRangeCommands) {
        commands.set_temperature_low = resolveTopic(config.temperature_low_command_topic || config.temp_lo_cmd_t, baseTopic);
        commands.set_temperature_high = resolveTopic(config.temperature_high_command_topic || config.temp_hi_cmd_t, baseTopic);
      } else {
        commands.set_temperature = resolveTopic(config.temperature_command_topic || config.temp_cmd_t, baseTopic);
      }
      
      return commands;
    },
  },
];

export const getWidgetByType = (type) => {
  return WIDGET_REGISTRY.find((widget) => widget.type === type);
};