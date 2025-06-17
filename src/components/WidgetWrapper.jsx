// src/components/WidgetWrapper.jsx
import React from 'react';
import { Paper, Box, IconButton, Typography, Tooltip } from '@mui/material';
import { Edit, Delete, DragIndicator } from '@mui/icons-material';

const WidgetWrapper = ({ 
  children, 
  component, 
  onEdit, 
  onDelete, 
  lockMode 
}) => {
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(component.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Ви впевнені, що хочете видалити віджет "${component.label || component.id}"?`)) {
      onDelete(component.id);
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden'
      }}
    >
      <Box
        className="widget-header" // Ручка для перетягування
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          backgroundColor: lockMode ? 'transparent' : 'action.hover',
          cursor: lockMode ? 'default' : 'move',
        }}
      >
        <DragIndicator sx={{ opacity: lockMode ? 0 : 0.5, mr: 1, pointerEvents: 'none' }} />
        <Typography variant="subtitle2" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {component.label || 'Widget'}
        </Typography>
        
        {!lockMode && (
          // --- ДОДАЄМО КЛАС ДО ОБГОРТКИ КНОПОК ---
          <Box className="widget-no-drag"> 
            <Tooltip title="Редагувати">
              <IconButton size="small" onClick={handleEdit}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Видалити">
              <IconButton size="small" onClick={handleDelete}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, padding: '8px', position: 'relative' }}>
        {children}
      </Box>
    </Paper>
  );
};

export default WidgetWrapper;