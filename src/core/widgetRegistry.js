// src/core/widgetRegistry.js

import SwitchComponent from "../components/widgets/SwitchComponent";
import SensorComponent from "../components/widgets/SensorComponent";
import ClimateComponent from "../components/widgets/ClimateComponent"; // Єдиний UI компонент для клімату

export const WIDGET_REGISTRY = [
  {
    type: "sensor",
    label: "Сенсор (тільки читання)",
    component: SensorComponent,
    topicFields: ["stat_t", "unit_of_meas"],
    getTopicMappings: (config) => ({ value: config.stat_t }),
  },
  {
    type: "switch",
    label: "Перемикач (ON/OFF)",
    component: SwitchComponent,
    topicFields: ["stat_t", "cmd_t", "pl_on", "pl_off"],
    getTopicMappings: (config) => ({ value: config.stat_t }),
    getCommandMappings: (config) => ({ default: config.cmd_t }),
  },
  // --- ТИП 1: Класичний термостат ---
  {
    type: "thermostat",
    label: "Термостат (одна температура)",
    component: ClimateComponent, // Використовує той самий компонент!
    topicFields: [
      "curr_temp_t",
      "mode_stat_t",
      "act_t",
      "temp_stat_t", // Топік стану для цільової температури
      "mode_cmd_t",
      "temp_cmd_t", // Топік команди для цільової температури
    ],
    getTopicMappings: (config) => ({
      current_temperature: config.curr_temp_t,
      mode: config.mode_stat_t,
      action: config.act_t,
      temperature: config.temp_stat_t, // Мапить на єдину цільову температуру
    }),
    getCommandMappings: (config) => ({
      set_mode: config.mode_cmd_t,
      set_temperature: config.temp_cmd_t, // Команда для єдиної цільової температури
    }),
  },
  // --- ТИП 2: Термостат з діапазоном (Bang-Bang) ---
  {
    type: "thermostat_range",
    label: "Термостат (діапазон)",
    component: ClimateComponent, // Використовує той самий компонент!
    topicFields: [
      "curr_temp_t",
      "mode_stat_t",
      "act_t",
      "temp_lo_stat_t", // Топік стану для нижньої межі
      "temp_hi_stat_t", // Топік стану для верхньої межі
      "mode_cmd_t",
      "temp_lo_cmd_t", // Топік команди для нижньої межі
      "temp_hi_cmd_t", // Топік команди для верхньої межі
    ],
    getTopicMappings: (config) => ({
      current_temperature: config.curr_temp_t,
      mode: config.mode_stat_t,
      action: config.act_t,
      temperature_low: config.temp_lo_stat_t, // Мапить на нижню межу
      temperature_high: config.temp_hi_stat_t, // Мапить на верхню межу
    }),
    getCommandMappings: (config) => ({
      set_mode: config.mode_cmd_t,
      set_temperature_low: config.temp_lo_cmd_t, // Команда для нижньої межі
      set_temperature_high: config.temp_hi_cmd_t, // Команда для верхньої межі
    }),
  },
];

export const getWidgetByType = (type) => {
  return WIDGET_REGISTRY.find((widget) => widget.type === type);
};
