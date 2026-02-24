// src/components/widgets/ButtonComponent.jsx
import React from 'react';
import { ButtonBase, Typography } from '@mui/material';
import { SmartButton, RestartAlt, SystemUpdateAlt } from '@mui/icons-material';
import commandDispatcher from '../../core/CommandDispatcher';
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { ModernWidgetCard } from './ModernWidgetCard';

const hapticsImpact = async () => {
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { /* ignore */ }
};

const getIcon = (deviceClass) => {
    switch(deviceClass) {
        case 'restart': return <RestartAlt />;
        case 'update': return <SystemUpdateAlt />;
        default: return <SmartButton />;
    }
}

const ButtonComponent = ({ componentConfig }) => {
  const { label, device_class, payload_press = '' } = componentConfig;

  const handleClick = () => {
    hapticsImpact();
    commandDispatcher.dispatch({
      entityId: componentConfig.id,
      value: payload_press,
    });
  };

  return (
    <ModernWidgetCard 
      title={label || "Кнопка"}
      onClick={handleClick}
      statusIcon={getIcon(device_class)}
    >
      <Typography variant="button" textAlign="center" sx={{ mt: 2 }}>{label}</Typography>
    </ModernWidgetCard>
  );
};

export default ButtonComponent;