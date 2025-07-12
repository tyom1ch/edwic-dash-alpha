// src/components/widgets/ButtonComponent.jsx
import React from 'react';
import { Card, ButtonBase, Typography } from '@mui/material';
import { SmartButton, RestartAlt, SystemUpdateAlt } from '@mui/icons-material';
import commandDispatcher from '../../core/CommandDispatcher';
import { Haptics, ImpactStyle } from "@capacitor/haptics";

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
    <Card sx={{ height: '100%' }}>
      <ButtonBase
        onClick={handleClick}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          p: 2,
        }}
      >
        {getIcon(device_class)}
        <Typography variant="button" textAlign="center">{label}</Typography>
      </ButtonBase>
    </Card>
  );
};

export default ButtonComponent;