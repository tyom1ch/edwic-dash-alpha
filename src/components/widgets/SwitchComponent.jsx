// src/components/widgets/SwitchComponent.jsx
import React from 'react';
import { Card, CardContent, Typography, Box, ButtonBase } from '@mui/material';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import useEntity from '../../hooks/useEntity';
import commandDispatcher from '../../core/CommandDispatcher';

// Тактильний відгук
const hapticsImpactLight = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // Ігноруємо помилку, якщо тактильний відгук недоступний
  }
};

const SwitchComponent = ({ componentConfig }) => {
  // 1. Отримуємо стан так само, як і в сенсорі
  const entity = useEntity(componentConfig.id);

  // 2. Визначаємо стан для відображення
  const state = entity?.value; // 'ON', 'OFF', або null
  const displayState = state ?? '---'; // Якщо стан невідомий, показуємо '---'

  const handleToggle = () => {
    // Не дозволяємо змінювати стан, якщо він ще не отриманий
    if (state === null || typeof state === 'undefined') return;

    hapticsImpactLight();

    // Визначаємо нову команду
    const commandValue = state === 'ON' ? 'OFF' : 'ON';

    // Відправляємо команду через диспетчер
    commandDispatcher.dispatch({
      entityId: componentConfig.id,
      value: commandValue,
    });
  };

  const isOn = state === 'ON';

  return (
    <Card 
      sx={{ 
        height: '100%', 
        // Змінюємо колір фону в залежності від стану, щоб було зрозуміло
        backgroundColor: isOn ? 'action.hover' : 'transparent',
        transition: 'background-color 0.3s'
      }}
    >
      <ButtonBase
        onClick={handleToggle}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex', // Важливо для вирівнювання
          flexDirection: 'column',
          textAlign: 'left',
          padding: 0, // Прибираємо внутрішні відступи ButtonBase
        }}
      >
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* Заголовок більше не потрібен тут, він є у WidgetWrapper */}
          {/* <Typography variant="h6" component="div">
            {componentConfig.label || 'Switch'}
          </Typography> */}

          <Box 
            sx={{ 
              flexGrow: 1,
              display: 'flex', 
              alignItems: 'center', // Вертикальне вирівнювання по центру
              justifyContent: 'center', // Горизонтальне вирівнювання по центру
            }}
          >
            <Typography 
              variant="h3" 
              component="span"
              sx={{ color: isOn ? 'text.primary' : 'text.secondary', fontWeight: 'bold' }}
            >
              {displayState}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" align="center">
            {entity?.last_updated ? new Date(entity.last_updated).toLocaleString() : 'No updates yet'}
          </Typography>
        </CardContent>
      </ButtonBase>
    </Card>
  );
};

export default SwitchComponent;