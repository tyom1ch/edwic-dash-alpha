// src/components/widgets/SensorComponent.jsx
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import useEntity from '../../hooks/useEntity';
// Імпортуємо нашу нову функцію
import { evaluateValueTemplate } from '../../utils/templateEvaluator'; 

const SensorComponent = ({ componentConfig }) => {
  // Використовуємо наш хук, щоб отримати стан сутності
  const entity = useEntity(componentConfig.id);

  // Отримуємо сире значення з сутності
  const rawValue = entity?.value;
  // Отримуємо шаблон з конфігурації компонента
  const template = entity?.val_tpl;

  // Обробляємо сире значення за допомогою шаблону
  const displayValue = evaluateValueTemplate(template, rawValue);
  
  // Одиниці виміру беремо як і раніше
  const unit = entity?.unit_of_meas || componentConfig?.unit_of_meas || '';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="div">
          {componentConfig.name || 'Sensor'}
        </Typography>
        <Box 
            sx={{ 
                display: 'flex', 
                alignItems: 'baseline', 
                justifyContent: 'center', 
                mt: 2 
            }}
        >
          <Typography variant="h3" component="span">
            {/* Використовуємо оброблене значення */}
            {displayValue}
          </Typography>
          {unit && (
            <Typography variant="h5" component="span" sx={{ ml: 1 }}>
              {unit}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" align="center">
          {entity?.last_updated ? new Date(entity.last_updated).toLocaleString() : 'No updates yet'}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SensorComponent;