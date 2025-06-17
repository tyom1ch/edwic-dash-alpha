// src/widgets/widgetRegistry.js

import SwitchComponent from '../widgets/SwitchComponent';
import SensorComponent from '../widgets/SensorComponent';
// 1. ІМПОРТУЄМО НАШ НОВИЙ КОМПОНЕНТ
import FanComponent from '../widgets/FanComponent'; 

export const WIDGET_REGISTRY = [
  {
    type: 'sensor',
    label: 'Сенсор (тільки читання)',
    component: SensorComponent,
    fields: ['state_topic', 'unit_of_measurement']
  },
  {
    type: 'switch',
    label: 'Перемикач (ON/OFF)',
    component: SwitchComponent,
    fields: ['state_topic', 'command_topic', 'payload_on', 'payload_off']
  },
  // 2. ДОДАЄМО НОВИЙ ВІДЖЕТ В РЕЄСТР
  {
    type: 'fan',
    label: 'Вентилятор (з потужністю)',
    component: FanComponent,
    // Вказуємо, які поля йому потрібні для налаштування
    fields: ['state_topic', 'command_topic', 'speed_state_topic', 'speed_command_topic']
  },
];

export const getWidgetByType = (type) => {
  return WIDGET_REGISTRY.find(widget => widget.type === type);
};