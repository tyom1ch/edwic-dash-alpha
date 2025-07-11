// src/core/widgetRegistry.js

import SwitchComponent from "../components/widgets/SwitchComponent";
import SensorComponent from "../components/widgets/SensorComponent";
import ClimateComponent from "../components/widgets/ClimateComponent";
import LightComponent from "../components/widgets/LightComponent";
import FanComponent from "../components/widgets/FanComponent";
import CoverComponent from "../components/widgets/CoverComponent";
import BinarySensorComponent from "../components/widgets/BinarySensorComponent";
import NumberComponent from "../components/widgets/NumberComponent";

// ... функція resolveTopic залишається без змін ...
const resolveTopic = (topic, baseTopic) => {
  if (typeof topic === "string" && topic.startsWith("~/") && baseTopic) {
    return topic.replace("~", baseTopic);
  }
  return topic;
};

export const WIDGET_REGISTRY = [
  // --- ІСНУЮЧИЙ ВІДЖЕТ: SENSOR ---
  {
    type: "sensor",
    label: "Сенсор (тільки читання)",
    component: SensorComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1 },
    getConfigFields: () => [
      {
        id: "state_topic",
        label: "Топік стану (State Topic)",
        keys: ["state_topic", "stat_t"],
      },
      {
        id: "unit_of_measurement",
        label: "Одиниця виміру",
        keys: ["unit_of_measurement", "unit_of_meas"],
      },
      {
        id: "device_class",
        label: "Клас пристрою",
        keys: ["device_class", "dev_cla"],
      }, // Додано для іконок
    ],
    getTopicMappings: (config) => ({
      value: resolveTopic(config.state_topic || config.stat_t, config["~"]),
    }),
  },
  // --- ІСНУЮЧИЙ ВІДЖЕТ: SWITCH ---
  {
    type: "switch",
    label: "Перемикач (ON/OFF)",
    component: SwitchComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1 },
    getConfigFields: () => [
      {
        id: "state_topic",
        label: "Топік стану (State Topic)",
        keys: ["state_topic", "stat_t"],
      },
      {
        id: "command_topic",
        label: "Топік команд (Command Topic)",
        keys: ["command_topic", "cmd_t"],
      },
      {
        id: "payload_on",
        label: "Значення для ON",
        keys: ["payload_on", "pl_on"],
      },
      {
        id: "payload_off",
        label: "Значення для OFF",
        keys: ["payload_off", "pl_off"],
      },
    ],
    getTopicMappings: (config) => ({
      value: resolveTopic(config.state_topic || config.stat_t, config["~"]),
    }),
    getCommandMappings: (config) => ({
      default: resolveTopic(config.command_topic || config.cmd_t, config["~"]),
    }),
  },
  // --- НОВИЙ ВІДЖЕТ: BINARY_SENSOR ---
  {
    type: "binary_sensor",
    label: "Бінарний сенсор (відкрито/закрито)",
    component: BinarySensorComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1 },
    getConfigFields: () => [
      {
        id: "state_topic",
        label: "Топік стану (State Topic)",
        keys: ["state_topic", "stat_t"],
      },
      {
        id: "payload_on",
        label: 'Значення "Увімкнено"',
        keys: ["payload_on", "pl_on"],
      },
      {
        id: "payload_off",
        label: 'Значення "Вимкнено"',
        keys: ["payload_off", "pl_off"],
      },
      {
        id: "device_class",
        label: "Клас пристрою (door, window, motion)",
        keys: ["device_class", "dev_cla"],
      },
    ],
    getTopicMappings: (config) => ({
      value: resolveTopic(config.state_topic || config.stat_t, config["~"]),
    }),
  },
  // --- НОВИЙ ВІДЖЕТ: LIGHT (з підтримкою яскравості та кольору) ---
  {
    type: "light",
    label: "Світло (з яскравістю/кольором)",
    component: LightComponent,
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2 },
    getConfigFields: () => [
      { id: "schema", label: "Схема (json або default)", keys: ["schema"] }, // Дуже важливо!
      {
        id: "state_topic",
        label: "Топік стану (ON/OFF)",
        keys: ["state_topic", "stat_t"],
      },
      {
        id: "command_topic",
        label: "Топік команд",
        keys: ["command_topic", "cmd_t"],
      },
      {
        id: "brightness_state_topic",
        label: "Топік стану яскравості",
        keys: ["brightness_state_topic", "brit_stat_t"],
      },
      {
        id: "brightness_command_topic",
        label: "Топік команди для яскравості",
        keys: ["brightness_command_topic", "brit_cmd_t"],
      },
      {
        id: "rgb_state_topic",
        label: "Топік стану RGB",
        keys: ["rgb_state_topic", "rgb_stat_t"],
      },
      {
        id: "rgb_command_topic",
        label: "Топік команди для RGB",
        keys: ["rgb_command_topic", "rgb_cmd_t"],
      },
      {
        id: "color_temp_state_topic",
        label: "Топік стану колірної температури",
        keys: ["color_temp_state_topic", "clr_temp_stat_t"],
      },
      {
        id: "color_temp_command_topic",
        label: "Топік команди для колірної температури",
        keys: ["color_temp_command_topic", "clr_temp_cmd_t"],
      },
      {
        id: "effect_state_topic",
        label: "Топік стану ефекту",
        keys: ["effect_state_topic", "fx_stat_t"],
      },
      {
        id: "effect_command_topic",
        label: "Топік команди для ефекту",
        keys: ["effect_command_topic", "fx_cmd_t"],
      },
      {
        id: "effect_list",
        label: "Список ефектів (через кому)",
        keys: ["effect_list", "fx_list"],
      },
    ],
    getTopicMappings: (config) => {
      const baseTopic = config["~"];
      return {
        state: resolveTopic(config.state_topic || config.stat_t, baseTopic),
        brightness: resolveTopic(
          config.brightness_state_topic || config.brit_stat_t,
          baseTopic
        ),
        rgb: resolveTopic(
          config.rgb_state_topic || config.rgb_stat_t,
          baseTopic
        ),
        color_temp: resolveTopic(
          config.color_temp_state_topic || config.clr_temp_stat_t,
          baseTopic
        ),
        effect: resolveTopic(
          config.effect_state_topic || config.fx_stat_t,
          baseTopic
        ),
        // Якщо схема json, топіки стану можуть бути об'єднані в одному JSON-повідомленні
        json_state:
          config.schema === "json"
            ? resolveTopic(config.state_topic || config.stat_t, baseTopic)
            : undefined,
      };
    },
    getCommandMappings: (config) => {
      const baseTopic = config["~"];
      // Якщо схема 'json', всі команди йдуть в один command_topic
      if (config.schema === "json") {
        return {
          json_command: resolveTopic(
            config.command_topic || config.cmd_t,
            baseTopic
          ),
        };
      }
      // Інакше, команди йдуть в окремі топіки
      return {
        set_state: resolveTopic(
          config.command_topic || config.cmd_t,
          baseTopic
        ),
        set_brightness: resolveTopic(
          config.brightness_command_topic || config.brit_cmd_t,
          baseTopic
        ),
        set_rgb: resolveTopic(
          config.rgb_command_topic || config.rgb_cmd_t,
          baseTopic
        ),
        set_color_temp: resolveTopic(
          config.color_temp_command_topic || config.clr_temp_cmd_t,
          baseTopic
        ),
        set_effect: resolveTopic(
          config.effect_command_topic || config.fx_cmd_t,
          baseTopic
        ),
      };
    },
  },
  // --- НОВИЙ ВІДЖЕТ: FAN ---
  {
    type: "fan",
    label: "Вентилятор",
    component: FanComponent,
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2 },
    getConfigFields: () => [
      {
        id: "state_topic",
        label: "Топік стану (ON/OFF)",
        keys: ["state_topic", "stat_t"],
      },
      {
        id: "command_topic",
        label: "Топік команд (ON/OFF)",
        keys: ["command_topic", "cmd_t"],
      },
      {
        id: "percentage_state_topic",
        label: "Топік стану швидкості (%)",
        keys: ["percentage_state_topic", "pct_stat_t"],
      },
      {
        id: "percentage_command_topic",
        label: "Топік команди для швидкості (%)",
        keys: ["percentage_command_topic", "pct_cmd_t"],
      },
      {
        id: "preset_mode_state_topic",
        label: "Топік стану режиму",
        keys: ["preset_mode_state_topic", "pr_mode_stat_t"],
      },
      {
        id: "preset_mode_command_topic",
        label: "Топік команди для режиму",
        keys: ["preset_mode_command_topic", "pr_mode_cmd_t"],
      },
      {
        id: "preset_modes",
        label: "Список режимів (через кому)",
        keys: ["preset_modes"],
      },
    ],
    getTopicMappings: (config) => {
      const baseTopic = config["~"];
      return {
        state: resolveTopic(config.state_topic || config.stat_t, baseTopic),
        percentage: resolveTopic(
          config.percentage_state_topic || config.pct_stat_t,
          baseTopic
        ),
        preset_mode: resolveTopic(
          config.preset_mode_state_topic || config.pr_mode_stat_t,
          baseTopic
        ),
      };
    },
    getCommandMappings: (config) => {
      const baseTopic = config["~"];
      return {
        set_state: resolveTopic(
          config.command_topic || config.cmd_t,
          baseTopic
        ),
        set_percentage: resolveTopic(
          config.percentage_command_topic || config.pct_cmd_t,
          baseTopic
        ),
        set_preset_mode: resolveTopic(
          config.preset_mode_command_topic || config.pr_mode_cmd_t,
          baseTopic
        ),
      };
    },
  },
  // --- НОВИЙ ВІДЖЕТ: COVER ---
  {
    type: "cover",
    label: "Ролети / Ворота",
    component: CoverComponent,
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1 },
    getConfigFields: () => [
      {
        id: "state_topic",
        label: "Топік стану (open/closed/opening/...)",
        keys: ["state_topic", "stat_t"],
      },
      {
        id: "command_topic",
        label: "Топік команд (OPEN/CLOSE/STOP)",
        keys: ["command_topic", "cmd_t"],
      },
      {
        id: "position_topic",
        label: "Топік стану позиції (%)",
        keys: ["position_topic", "pos_t"],
      },
      {
        id: "set_position_topic",
        label: "Топік для встановлення позиції (%)",
        keys: ["set_position_topic", "set_pos_t"],
      },
      {
        id: "payload_open",
        label: "Значення для OPEN",
        keys: ["payload_open", "pl_open"],
      },
      {
        id: "payload_close",
        label: "Значення для CLOSE",
        keys: ["payload_close", "pl_close"],
      },
      {
        id: "payload_stop",
        label: "Значення для STOP",
        keys: ["payload_stop", "pl_stop"],
      },
      {
        id: "device_class",
        label: "Клас пристрою (shutter, blind, gate)",
        keys: ["device_class", "dev_cla"],
      },
    ],
    getTopicMappings: (config) => {
      const baseTopic = config["~"];
      return {
        state: resolveTopic(config.state_topic || config.stat_t, baseTopic),
        position: resolveTopic(
          config.position_topic || config.pos_t,
          baseTopic
        ),
      };
    },
    getCommandMappings: (config) => {
      const baseTopic = config["~"];
      return {
        set_command: resolveTopic(
          config.command_topic || config.cmd_t,
          baseTopic
        ),
        set_position: resolveTopic(
          config.set_position_topic || config.set_pos_t,
          baseTopic
        ),
      };
    },
  },
  // --- ІСНУЮЧИЙ ВІДЖЕТ: CLIMATE ---
  {
    type: "climate",
    label: "Клімат-контроль (Універсальний)",
    component: ClimateComponent,
    // ... решта конфігурації клімату без змін ...
    defaultLayout: { w: 3, h: 2, minW: 3, minH: 2, maxH: 2, maxW: 4 },
    variants: [
      { id: "single", label: "Термостат (одна цільова температура)" },
      { id: "range", label: "Дводіапазонний (low/high)" },
    ],
    getConfigFields: (variant = "single") => {
      const baseFields = [
        {
          id: "current_temperature_topic",
          label: "Топік поточної температури",
          keys: ["current_temperature_topic", "curr_temp_t"],
        },
        {
          id: "mode_state_topic",
          label: "Топік стану режиму",
          keys: ["mode_state_topic", "mode_stat_t"],
        },
        {
          id: "action_topic",
          label: "Топік стану дії (heating/cooling)",
          keys: ["action_topic", "act_t"],
        },
        {
          id: "mode_command_topic",
          label: "Топік команди для режиму",
          keys: ["mode_command_topic", "mode_cmd_t"],
        },
        {
          id: "preset_mode_state_topic",
          label: "Топік стану пресету",
          keys: ["preset_mode_state_topic", "pr_mode_stat_t"],
        },
        {
          id: "preset_mode_command_topic",
          label: "Топік команди для пресету",
          keys: ["preset_mode_command_topic", "pr_mode_cmd_t"],
        },
        { id: "modes", label: "Доступні режими (через кому)", keys: ["modes"] },
        {
          id: "preset_modes",
          label: "Доступні пресети (через кому)",
          keys: ["preset_modes"],
        },
      ];

      const singleTempFields = [
        {
          id: "temperature_state_topic",
          label: "Топік цільової температури",
          keys: ["temperature_state_topic", "temp_stat_t"],
        },
        {
          id: "temperature_command_topic",
          label: "Топік команди для температури",
          keys: ["temperature_command_topic", "temp_cmd_t"],
        },
      ];

      const rangeTempFields = [
        {
          id: "temperature_low_state_topic",
          label: "Топік нижньої межі t°",
          keys: ["temperature_low_state_topic", "temp_lo_stat_t"],
        },
        {
          id: "temperature_high_state_topic",
          label: "Топік верхньої межі t°",
          keys: ["temperature_high_state_topic", "temp_hi_stat_t"],
        },
        {
          id: "temperature_low_command_topic",
          label: "Топік команди для нижньої межі t°",
          keys: ["temperature_low_command_topic", "temp_lo_cmd_t"],
        },
        {
          id: "temperature_high_command_topic",
          label: "Топік команди для верхньої межі t°",
          keys: ["temperature_high_command_topic", "temp_hi_cmd_t"],
        },
      ];

      if (variant === "range") {
        return [...baseFields, ...rangeTempFields];
      }
      return [...baseFields, ...singleTempFields];
    },
    getTopicMappings: (config) => {
      // ... (без змін)
      const baseTopic = config["~"];
      const mappings = {
        current_temperature: resolveTopic(
          config.current_temperature_topic || config.curr_temp_t,
          baseTopic
        ),
        mode: resolveTopic(
          config.mode_state_topic || config.mode_stat_t,
          baseTopic
        ),
        action: resolveTopic(config.action_topic || config.act_t, baseTopic),
        preset_mode: resolveTopic(
          config.preset_mode_state_topic || config.pr_mode_stat_t,
          baseTopic
        ),
        presets: config.preset_modes,
        modes: config.modes,
        variant: config.variant || "single",
      };
      const isRange = config.variant === "range";
      if (isRange) {
        mappings.temperature_low = resolveTopic(
          config.temperature_low_state_topic || config.temp_lo_stat_t,
          baseTopic
        );
        mappings.temperature_high = resolveTopic(
          config.temperature_high_state_topic || config.temp_hi_stat_t,
          baseTopic
        );
      } else {
        mappings.temperature = resolveTopic(
          config.temperature_state_topic || config.temp_stat_t,
          baseTopic
        );
      }
      return mappings;
    },
    getCommandMappings: (config) => {
      // ... (без змін)
      const baseTopic = config["~"];
      const commands = {
        set_mode: resolveTopic(
          config.mode_command_topic || config.mode_cmd_t,
          baseTopic
        ),
        set_preset_mode: resolveTopic(
          config.preset_mode_command_topic || config.pr_mode_cmd_t,
          baseTopic
        ),
      };
      const isRange = config.variant === "range";
      if (isRange) {
        commands.set_temperature_low = resolveTopic(
          config.temperature_low_command_topic || config.temp_lo_cmd_t,
          baseTopic
        );
        commands.set_temperature_high = resolveTopic(
          config.temperature_high_command_topic || config.temp_hi_cmd_t,
          baseTopic
        );
      } else {
        commands.set_temperature = resolveTopic(
          config.temperature_command_topic || config.temp_cmd_t,
          baseTopic
        );
      }
      return commands;
    },
  },
  {
    type: "number",
    label: "Число (Slider/Box)",
    component: NumberComponent, // Потрібно створити і імпортувати цей компонент
    defaultLayout: { w: 2, h: 1, minW: 2, minH: 1 },
    getConfigFields: () => [
      {
        id: "state_topic",
        label: "Топік стану",
        keys: ["state_topic", "stat_t"],
      },
      {
        id: "command_topic",
        label: "Топік команд",
        keys: ["command_topic", "cmd_t"],
      },
      {
        id: "unit_of_measurement",
        label: "Одиниця виміру",
        keys: ["unit_of_measurement", "unit_of_meas"],
      },
      { id: "min", label: "Мінімальне значення", keys: ["min"] },
      { id: "max", label: "Максимальне значення", keys: ["max"] },
      { id: "step", label: "Крок", keys: ["step"] },
      { id: "mode", label: "Режим відображення (slider/box)", keys: ["mode"], modes: ["slider", "box"] }, // Ключове поле для вибору режиму
    ],
    getTopicMappings: (config) => ({
      value: resolveTopic(config.state_topic || config.stat_t, config["~"]),
    }),
    getCommandMappings: (config) => ({
      // Використовуємо "default", оскільки це єдина команда для цього віджету
      default: resolveTopic(config.command_topic || config.cmd_t, config["~"]),
    }),
  },
];

export const getWidgetByType = (type) => {
  return WIDGET_REGISTRY.find((widget) => widget.type === type);
};
