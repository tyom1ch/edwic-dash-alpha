// src/components/widgets/BinarySensorComponent.jsx
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { SensorDoor, MeetingRoom, MotionPhotosAuto, HelpOutline } from '@mui/icons-material';
import useEntity from '../../hooks/useEntity';

// Функція для вибору іконки на основі device_class
const getDeviceClassIcon = (deviceClass) => {
  switch (deviceClass) {
    case 'door':
    case 'garage_door':
    case 'window':
      return <SensorDoor sx={{ fontSize: 60 }} />;
    case 'motion':
    case 'presence':
      return <MotionPhotosOn sx={{ fontSize: 60 }} />;
    case 'opening':
      return <MeetingRoom sx={{ fontSize: 60 }} />;
    default:
      return <HelpOutline sx={{ fontSize: 60 }} />;
  }
};

// Функція для отримання текстового представлення стану
const getStateText = (isOn, deviceClass) => {
    if (isOn === null) return "---";
    switch (deviceClass) {
        case 'door':
        case 'window':
            return isOn ? 'Відчинено' : 'Зачинено';
        case 'motion':
            return isOn ? 'Рух' : 'Немає руху';
        case 'presence':
            return isOn ? 'Присутній' : 'Відсутній';
        case 'plug':
            return isOn ? 'В розетці' : 'Вимкнено';
        default:
            return isOn ? 'ON' : 'OFF';
    }
}


const BinarySensorComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  const {
    payload_on = 'ON',
    payload_off = 'OFF',
    device_class,
  } = componentConfig;

  const state = entity?.value;
  const lastUpdated = entity?.last_updated
    ? new Date(entity.last_updated).toLocaleString()
    : 'Не оновлювалось';

  const isOn = state !== null && state !== undefined ? String(state) === String(payload_on) : null;
  
  const isReady = isOn !== null;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        backgroundColor: isReady && isOn ? 'action.hover' : 'transparent',
        transition: 'background-color 0.3s',
        display: 'flex',
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', p: 2 }}>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            color: isReady ? (isOn ? 'text.primary' : 'text.secondary') : 'text.disabled'
          }}
        >
          {getDeviceClassIcon(device_class)}
          <Typography
            variant="h4"
            component="span"
            sx={{
              fontWeight: 'bold',
            }}
          >
            {getStateText(isOn, device_class)}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            pt: 1,
            whiteSpace: 'nowrap',
            width: '100%',
            textAlign: 'center',
            fontSize: '0.75rem',
          }}
        >
          {lastUpdated}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BinarySensorComponent;