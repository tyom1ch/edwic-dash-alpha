// src/components/widgets/GenericInfoComponent.jsx
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import useEntity from '../../hooks/useEntity';

const GenericInfoComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  // Створюємо об'єкт для відображення, що включає основний стан та атрибути
  const displayData = {
    state: entity?.value,
    attributes: entity?.attributes,
    last_updated: entity?.last_updated ? new Date(entity.last_updated).toISOString() : null,
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          {componentConfig.label || 'Generic Info'}
        </Typography>
        <Box
          component="pre"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontSize: '0.8rem',
            backgroundColor: 'action.hover',
            borderRadius: 1,
            p: 1,
          }}
        >
          {JSON.stringify(displayData, null, 2)}
        </Box>
      </CardContent>
    </Card>
  );
};

export default GenericInfoComponent;