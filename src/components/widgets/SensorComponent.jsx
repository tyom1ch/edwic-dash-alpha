// src/components/widgets/SensorComponent.jsx
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import useEntity from '../../hooks/useEntity';

const SensorComponent = ({ componentConfig }) => {
  // Використовуємо наш хук, передаючи ID компонента як ID сутності.
  const entity = useEntity(componentConfig.id);

  // Визначаємо значення та одиниці виміру для відображення
  const value = entity?.value ?? '---';
  const unit = componentConfig.unit_of_measurement || '';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="div">
          {componentConfig.label || 'Sensor'}
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
            {value}
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