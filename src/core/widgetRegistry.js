// src/core/widgetRegistry.js

import SwitchComponent from "../components/widgets/SwitchComponent";
import SensorComponent from "../components/widgets/SensorComponent";
import ClimateComponent from "../components/widgets/ClimateComponent";

// ... resolveTopic функція залишається без змін ...
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
    // --- НОВИЙ ФОРМАТ: СТРУКТУРОВАНИЙ ОПИС ПОЛІВ ---
    getConfigFields: () => [
      { id: 'state_topic', label: 'Топік стану (State Topic)', keys: ['state_topic', 'stat_t'] },
      { id: 'unit_of_measurement', label: 'Одиниця виміру', keys: ['unit_of_measurement', 'unit_of_meas'] },
    ],
    getTopicMappings: (config) => ({
      value: config.state_topic || config.stat_t
    }),
  },
  {
    type: "switch",
    label: "Перемикач (ON/OFF)",
    component: SwitchComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1 },
    // --- НОВИЙ ФОРМАТ ---
    getConfigFields: () => [
      { id: 'state_topic', label: 'Топік стану (State Topic)', keys: ['state_topic', 'stat_t'] },
      { id: 'command_topic', label: 'Топік команд (Command Topic)', keys: ['command_topic', 'cmd_t'] },
      { id: 'payload_on', label: 'Значення для ON', keys: ['payload_on', 'pl_on'] },
      { id: 'payload_off', label: 'Значення для OFF', keys: ['payload_off', 'pl_off'] },
    ],
    getTopicMappings: (config) => ({ 
      value: resolveTopic(config.state_topic || config.stat_t, config['~'])
    }),
    getCommandMappings: (config) => ({
      default: resolveTopic(config.command_topic || config.cmd_t, config['~'])
    }),
  },
  {
    type: "climate",
    label: "Клімат-контроль (Універсальний)",
    component: ClimateComponent,
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2, maxH: 2, maxW: 2 },
    variants: [
      { id: 'single', label: 'Термостат (одна цільова температура)' },
      { id: 'range', label: 'Дводіапазонний (low/high)' },
    ],
    // --- ОНОВЛЕНА ФУНКЦІЯ ПОВЕРТАЄ НОВИЙ СТРУКТУРОВАНИЙ ФОРМАТ ---
    getConfigFields: (variant = 'single') => {
      const baseFields = [
        { id: 'current_temperature_topic', label: 'Топік поточної температури', keys: ['current_temperature_topic', 'curr_temp_t'] },
        { id: 'mode_state_topic', label: 'Топік стану режиму', keys: ['mode_state_topic', 'mode_stat_t'] },
        { id: 'action_topic', label: 'Топік стану дії (heating/cooling)', keys: ['action_topic', 'act_t'] },
        { id: 'mode_command_topic', label: 'Топік команди для режиму', keys: ['mode_command_topic', 'mode_cmd_t'] },
        { id: 'preset_mode_state_topic', label: 'Топік стану пресету', keys: ['preset_mode_state_topic', 'pr_mode_stat_t'] },
        { id: 'preset_mode_command_topic', label: 'Топік команди для пресету', keys: ['preset_mode_command_topic', 'pr_mode_cmd_t'] },
        { id: 'modes', label: 'Доступні режими (через кому)', keys: ['modes'] },
        { id: 'preset_modes', label: 'Доступні пресети (через кому)', keys: ['preset_modes'] },
      ];
      
      const singleTempFields = [
        { id: 'temperature_state_topic', label: 'Топік цільової температури', keys: ['temperature_state_topic', 'temp_stat_t'] },
        { id: 'temperature_command_topic', label: 'Топік команди для температури', keys: ['temperature_command_topic', 'temp_cmd_t'] },
      ];

      const rangeTempFields = [
        { id: 'temperature_low_state_topic', label: 'Топік нижньої межі t°', keys: ['temperature_low_state_topic', 'temp_lo_stat_t'] },
        { id: 'temperature_high_state_topic', label: 'Топік верхньої межі t°', keys: ['temperature_high_state_topic', 'temp_hi_stat_t'] },
        { id: 'temperature_low_command_topic', label: 'Топік команди для нижньої межі t°', keys: ['temperature_low_command_topic', 'temp_lo_cmd_t'] },
        { id: 'temperature_high_command_topic', label: 'Топік команди для верхньої межі t°', keys: ['temperature_high_command_topic', 'temp_hi_cmd_t'] },
      ];

      if (variant === 'range') {
        return [...baseFields, ...rangeTempFields];
      }
      return [...baseFields, ...singleTempFields];
    },
    getTopicMappings: (config) => {
      // ... (no changes here)
      const baseTopic = config['~'];
      const mappings = {
        current_temperature: resolveTopic(config.current_temperature_topic || config.curr_temp_t, baseTopic),
        mode: resolveTopic(config.mode_state_topic || config.mode_stat_t, baseTopic),
        action: resolveTopic(config.action_topic || config.act_t, baseTopic),
        preset_mode: resolveTopic(config.preset_mode_state_topic || config.pr_mode_stat_t, baseTopic),
        presets: config.preset_modes,
        modes: config.modes,
        variant: config.variant || 'single',
      };
      const isRange = config.variant === 'range';
      if (isRange) {
        mappings.temperature_low = resolveTopic(config.temperature_low_state_topic || config.temp_lo_stat_t, baseTopic);
        mappings.temperature_high = resolveTopic(config.temperature_high_state_topic || config.temp_hi_stat_t, baseTopic);
      } else {
        mappings.temperature = resolveTopic(config.temperature_state_topic || config.temp_stat_t, baseTopic);
      }
      return mappings;
    },
    getCommandMappings: (config) => {
      const baseTopic = config['~'];
      const commands = {
        set_mode: resolveTopic(config.mode_command_topic || config.mode_cmd_t, baseTopic),
        set_preset_mode: resolveTopic(config.preset_mode_command_topic || config.pr_mode_cmd_t, baseTopic),
      };
      const isRange = config.variant === 'range';
      if (isRange) {
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