// src/widgets/widgetRegistry.js

import SwitchComponent from '../components/widgets/SwitchComponent';
import SensorComponent from '../components/widgets/SensorComponent';

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
];

export const getWidgetByType = (type) => {
  return WIDGET_REGISTRY.find(widget => widget.type === type);
};