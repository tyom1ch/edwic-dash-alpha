// src/core/widgetRegistry.js

import SwitchComponent from "../components/widgets/SwitchComponent";
import SensorComponent from "../components/widgets/SensorComponent";
import ClimateComponent from "../components/widgets/ClimateComponent";
import LightComponent from "../components/widgets/LightComponent";
import FanComponent from "../components/widgets/FanComponent";
import CoverComponent from "../components/widgets/CoverComponent";
import BinarySensorComponent from "../components/widgets/BinarySensorComponent";
import NumberComponent from "../components/widgets/NumberComponent";
import ButtonComponent from "../components/widgets/ButtonComponent";
import GenericInfoComponent from "../components/widgets/GenericInfoComponent";

// функція resolveTopic
const resolveTopic = (topic, baseTopic) => {
  if (typeof topic === "string" && topic.startsWith("~/") && baseTopic) {
    return topic.replace("~", baseTopic);
  }
  return topic;
};

export const BINARY_SENSOR_DEVICE_CLASSES = [
  "door",
  "garage_door",
  "window",
  "motion",
  "presence",
  "plug",
  "opening",
];

export const WIDGET_REGISTRY = [
  {
    type: "sensor",
    label: "Сенсор (тільки читання)",
    component: SensorComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1, maxW: 4, maxH: 2 },
    getConfigFields: () => [
      { id: "state_topic", label: "Топік стану (State Topic)", keys: ["state_topic", "stat_t"] },
      { id: "unit_of_measurement", label: "Одиниця виміру", keys: ["unit_of_measurement", "unit_of_meas"] },
      { id: "device_class", label: "Клас пристрою", keys: ["device_class", "dev_cla"], isInfo: true },
    ],
    getTopicMappings: (config) => ({
      value: resolveTopic(config.state_topic || config.stat_t, config["~"]),
    }),
  },
  {
    type: "switch",
    label: "Перемикач (ON/OFF)",
    component: SwitchComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1, maxW: 4, maxH: 2 },
    getConfigFields: () => [
      { id: "state_topic", label: "Топік стану (State Topic)", keys: ["state_topic", "stat_t"] },
      { id: "command_topic", label: "Топік команд (Command Topic)", keys: ["command_topic", "cmd_t"] },
      { id: "payload_on", label: "Значення для ON", keys: ["payload_on", "pl_on"] },
      { id: "payload_off", label: "Значення для OFF", keys: ["payload_off", "pl_off"] },
    ],
    getTopicMappings: (config) => ({
      value: resolveTopic(config.state_topic || config.stat_t, config["~"]),
    }),
    getCommandMappings: (config) => ({
      default: resolveTopic(config.command_topic || config.cmd_t, config["~"]),
    }),
  },
  {
    type: "light",
    label: "Світло",
    component: LightComponent,
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2, maxW: 4, maxH: 3 },
    getConfigFields: () => [
      // Поля для редагування
      { id: "state_topic", label: "Топік стану", keys: ["state_topic", "stat_t"] },
      { id: "command_topic", label: "Топік команд", keys: ["command_topic", "cmd_t"] },
      // Інформаційні поля
      { id: "name", label: "Ім'я пристрою", keys: ["name"], isInfo: true },
      { id: "schema", label: "Схема", keys: ["schema"], isInfo: true },
      { id: "supported_color_modes", label: "Підтримувані режими кольору", keys: ["supported_color_modes"], isInfo: true },
      { id: "brightness", label: "Підтримка яскравості", keys: ["brightness"], isInfo: true },
      { id: "color_temp", label: "Підтримка температури", keys: ["color_temp"], isInfo: true },
      { id: "rgb", label: "Підтримка RGB", keys: ["rgb"], isInfo: true },
      { id: "effect", label: "Підтримка ефектів", keys: ["effect"], isInfo: true },
      { id: "effect_list", label: "Список ефектів", keys: ["effect_list", "fx_list"], isInfo: true },
      { id: "min_mireds", label: "Мін. температура (Mireds)", keys: ["min_mireds"], isInfo: true },
      { id: "max_mireds", label: "Макс. температура (Mireds)", keys: ["max_mireds"], isInfo: true },
      { id: "device", label: "Інформація про пристрій", keys: ["dev"], isInfo: true }
    ],
    getTopicMappings: (config) => {
      const baseTopic = config["~"];
      const isJsonSchema = config.schema?.toLowerCase() === 'json';
      if (isJsonSchema) {
        return { json_state: resolveTopic(config.state_topic || config.stat_t, baseTopic) };
      }
      return {
        state: resolveTopic(config.state_topic || config.stat_t, baseTopic),
        brightness: resolveTopic(config.brightness_state_topic || config.brit_stat_t, baseTopic),
        rgb: resolveTopic(config.rgb_state_topic || config.rgb_stat_t, baseTopic),
        color_temp: resolveTopic(config.color_temp_state_topic || config.clr_temp_stat_t, baseTopic),
        effect: resolveTopic(config.effect_state_topic || config.fx_stat_t, baseTopic),
      };
    },
    getCommandMappings: (config) => {
      const baseTopic = config["~"];
      const isJsonSchema = config.schema?.toLowerCase() === 'json';
      if (isJsonSchema) {
        return { json_command: resolveTopic(config.command_topic || config.cmd_t, baseTopic) };
      }
      return {
        set_state: resolveTopic(config.command_topic || config.cmd_t, baseTopic),
        set_brightness: resolveTopic(config.brightness_command_topic || config.brit_cmd_t, baseTopic),
        set_rgb: resolveTopic(config.rgb_command_topic || config.rgb_cmd_t, baseTopic),
        set_color_temp: resolveTopic(config.color_temp_command_topic || config.clr_temp_cmd_t, baseTopic),
        set_effect: resolveTopic(config.effect_command_topic || config.fx_cmd_t, baseTopic),
      };
    },
  },
  {
    type: "fan",
    label: "Вентилятор",
    component: FanComponent,
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2, maxW: 4, maxH: 3 },
    getConfigFields: () => [
      { id: "state_topic", label: "Топік стану (ON/OFF)", keys: ["state_topic", "stat_t"] },
      { id: "command_topic", label: "Топік команд (ON/OFF)", keys: ["command_topic", "cmd_t"] },
      { id: "percentage_state_topic", label: "Топік стану швидкості (%)", keys: ["percentage_state_topic", "pct_stat_t"] },
      { id: "percentage_command_topic", label: "Топік команди для швидкості (%)", keys: ["percentage_command_topic", "pct_cmd_t"] },
      { id: "preset_mode_state_topic", label: "Топік стану режиму", keys: ["preset_mode_state_topic", "pr_mode_stat_t"] },
      { id: "preset_mode_command_topic", label: "Топік команди для режиму", keys: ["preset_mode_command_topic", "pr_mode_cmd_t"] },
      { id: "preset_modes", label: "Список режимів", keys: ["preset_modes"], isInfo: true },
    ],
    getTopicMappings: (config) => ({
        state: resolveTopic(config.state_topic || config.stat_t, config["~"]),
        percentage: resolveTopic(config.percentage_state_topic || config.pct_stat_t, config["~"]),
        preset_mode: resolveTopic(config.preset_mode_state_topic || config.pr_mode_stat_t, config["~"]),
    }),
    getCommandMappings: (config) => ({
        set_state: resolveTopic(config.command_topic || config.cmd_t, config["~"]),
        set_percentage: resolveTopic(config.percentage_command_topic || config.pct_cmd_t, config["~"]),
        set_preset_mode: resolveTopic(config.preset_mode_command_topic || config.pr_mode_cmd_t, config["~"]),
    }),
  },
  {
    type: "cover",
    label: "Ролети / Ворота",
    component: CoverComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1, maxW: 4, maxH: 2 },
    getConfigFields: () => [
      { id: "state_topic", label: "Топік стану", keys: ["state_topic", "stat_t"] },
      { id: "command_topic", label: "Топік команд (OPEN/CLOSE/STOP)", keys: ["command_topic", "cmd_t"] },
      { id: "position_topic", label: "Топік стану позиції (%)", keys: ["position_topic", "pos_t"] },
      { id: "set_position_topic", label: "Топік для встановлення позиції (%)", keys: ["set_position_topic", "set_pos_t"] },
      { id: "payload_open", label: "Значення для OPEN", keys: ["payload_open", "pl_open"] },
      { id: "payload_close", label: "Значення для CLOSE", keys: ["payload_close", "pl_close"] },
      { id: "payload_stop", label: "Значення для STOP", keys: ["payload_stop", "pl_stop"] },
      { id: "device_class", label: "Клас пристрою", keys: ["device_class", "dev_cla"], isInfo: true },
    ],
    getTopicMappings: (config) => ({
        state: resolveTopic(config.state_topic || config.stat_t, config["~"]),
        position: resolveTopic(config.position_topic || config.pos_t, config["~"]),
    }),
    getCommandMappings: (config) => ({
        set_command: resolveTopic(config.command_topic || config.cmd_t, config["~"]),
        set_position: resolveTopic(config.set_position_topic || config.set_pos_t, config["~"]),
    }),
  },
  {
    type: "climate",
    label: "Клімат-контроль",
    component: ClimateComponent,
    defaultLayout: { w: 3, h: 2, minW: 3, minH: 2, maxW: 4, maxH: 2 },
    variants: [
      { id: "single", label: "Термостат" },
      { id: "range", label: "Дводіапазонний" },
    ],
    getConfigFields: (variant = "single") => {
      const baseFields = [
        // Редаговані
        { id: "current_temperature_topic", label: "Топік поточної температури", keys: ["current_temperature_topic", "curr_temp_t"] },
        { id: "mode_state_topic", label: "Топік стану режиму", keys: ["mode_state_topic", "mode_stat_t"] },
        { id: "action_topic", label: "Топік стану дії (heating/cooling)", keys: ["action_topic", "act_t"] },
        { id: "mode_command_topic", label: "Топік команди для режиму", keys: ["mode_command_topic", "mode_cmd_t"] },
        { id: "preset_mode_state_topic", label: "Топік стану пресету", keys: ["preset_mode_state_topic", "pr_mode_stat_t"] },
        { id: "preset_mode_command_topic", label: "Топік команди для пресету", keys: ["preset_mode_command_topic", "pr_mode_cmd_t"] },
        // Інформаційні
        { id: "modes", label: "Доступні режими", keys: ["modes"], isInfo: true },
        { id: "preset_modes", label: "Доступні пресети", keys: ["preset_modes"], isInfo: true },
      ];
      const singleTempFields = [
        { id: "temperature_state_topic", label: "Топік цільової температури", keys: ["temperature_state_topic", "temp_stat_t"] },
        { id: "temperature_command_topic", label: "Топік команди для температури", keys: ["temperature_command_topic", "temp_cmd_t"] },
      ];
      const rangeTempFields = [
        { id: "temperature_low_state_topic", label: "Топік нижньої межі t°", keys: ["temperature_low_state_topic", "temp_lo_stat_t"] },
        { id: "temperature_high_state_topic", label: "Топік верхньої межі t°", keys: ["temperature_high_state_topic", "temp_hi_stat_t"] },
        { id: "temperature_low_command_topic", label: "Топік команди для нижньої межі t°", keys: ["temperature_low_command_topic", "temp_lo_cmd_t"] },
        { id: "temperature_high_command_topic", label: "Топік команди для верхньої межі t°", keys: ["temperature_high_command_topic", "temp_hi_cmd_t"] },
      ];
      return variant === 'range' ? [...baseFields, ...rangeTempFields] : [...baseFields, ...singleTempFields];
    },
    getTopicMappings: (config) => {
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
  {
    type: "number",
    label: "Число (Slider/Box)",
    component: NumberComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1, maxW: 4, maxH: 2 },
    getConfigFields: () => [
      // Редаговані
      { id: "state_topic", label: "Топік стану", keys: ["state_topic", "stat_t"] },
      { id: "command_topic", label: "Топік команд", keys: ["command_topic", "cmd_t"] },
      { id: "mode", label: "Режим відображення", keys: ["mode"], modes: ["slider", "box"] },
      // Інформаційні
      { id: "unit_of_measurement", label: "Одиниця виміру", keys: ["unit_of_measurement", "unit_of_meas"], isInfo: true },
      { id: "min", label: "Мінімальне значення", keys: ["min"], isInfo: true },
      { id: "max", label: "Максимальне значення", keys: ["max"], isInfo: true },
      { id: "step", label: "Крок", keys: ["step"], isInfo: true },
    ],
    getTopicMappings: (config) => ({
      value: resolveTopic(config.state_topic || config.stat_t, config["~"]),
    }),
    getCommandMappings: (config) => ({
      default: resolveTopic(config.command_topic || config.cmd_t, config["~"]),
    }),
  },
  {
    type: "button",
    label: "Кнопка (Дія)",
    component: ButtonComponent,
    defaultLayout: { w: 2, h: 1, minW: 1, minH: 1, maxW: 4, maxH: 1 },
    getConfigFields: () => [
      { id: "command_topic", label: "Топік команд (Command Topic)", keys: ["command_topic", "cmd_t"] },
      { id: "payload_press", label: "Значення для натискання", keys: ["payload_press", "pl_prs"] },
      { id: "device_class", label: "Клас пристрою (для іконки)", keys: ["device_class", "dev_cla"], isInfo: true },
    ],
    getTopicMappings: (config) => ({
      // Button is stateless from the dashboard's perspective
    }),
    getCommandMappings: (config) => ({
      default: resolveTopic(config.command_topic || config.cmd_t, config["~"]),
    }),
  },
  {
    type: "generic_info",
    label: "Загальна інформація (JSON)",
    component: GenericInfoComponent,
    defaultLayout: { w: 3, h: 2, minW: 2, minH: 2 },
    getConfigFields: () => [
      { id: "state_topic", label: "Топік стану (State Topic)", keys: ["state_topic", "stat_t"] },
      { id: "json_attributes_topic", label: "Топік атрибутів (JSON Attributes Topic)", keys: ["json_attributes_topic", "json_attr_t"] },
    ],
    getTopicMappings: (config) => ({
      value: resolveTopic(config.state_topic || config.stat_t, config["~"]),
      attributes: resolveTopic(config.json_attributes_topic || config.json_attr_t, config["~"]),
    }),
    getCommandMappings: (config) => ({}), // No commands for info component
  },
];

/**
 * Отримує список об'єктів обов'язкових полів для заданого типу віджета та його варіанта.
 * @param {string} type - Тип віджета (напр. 'climate').
 * @param {string} [variant] - Варіант віджета (напр. 'range').
 * @returns {Array<Object>} - Масив об'єктів, що описують обов'язкові поля.
 */
export const getRequiredFields = (type, variant) => {
  const widget = WIDGET_REGISTRY.find((w) => w.type === type);
  if (!widget) return [];

  // Передаємо варіант у getConfigFields, якщо він існує для цього типу віджета
  const configFields = widget.getConfigFields?.(variant);
  if (!configFields) return [];

  // Повертаємо повні об'єкти полів, які не є інформаційними
  return configFields.filter((field) => !field.isInfo);
};


export const getWidgetById = (type) => {
  return WIDGET_REGISTRY.find((widget) => widget.type === type);
};