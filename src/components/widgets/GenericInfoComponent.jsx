// src/components/widgets/GenericInfoComponent.jsx
import React from 'react';
import { Box } from '@mui/material';
import useEntity from '../../hooks/useEntity';
import { ModernWidgetCard } from './ModernWidgetCard';

const GenericInfoComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  // Створюємо об'єкт для відображення, що включає основний стан та атрибути
  const displayData = {
    state: entity?.value,
    attributes: entity?.attributes,
    last_updated: entity?.last_updated ? new Date(entity.last_updated).toISOString() : null,
  };

  return (
    <ModernWidgetCard title={componentConfig.label || 'Інформація (JSON)'}>
        <Box
          component="pre"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontSize: '0.75rem',
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            m: 0,
            overflow: 'auto',
            width: '100%',
            height: '100%',
            fontFamily: 'monospace'
          }}
        >
          {JSON.stringify(displayData, null, 2)}
        </Box>
    </ModernWidgetCard>
  );
};

export default GenericInfoComponent;