// src/components/WidgetWrapper.jsx
import React from 'react';
import { Paper, Box, IconButton, Typography, Tooltip } from '@mui/material';
import { Edit, Delete, DragIndicator } from '@mui/icons-material';

const WidgetWrapper = ({ 
  children, 
  component, 
  onEdit, 
  onDelete, 
  lockMode,
  onClick, // <--- НОВИЙ ПРОПС
}) => {
  const handleEdit = (e) => {
    e.stopPropagation(); // Важливо, щоб клік на кнопці не викликав клік на обгортці
    onEdit(component.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // Важливо, щоб клік на кнопці не викликав клік на обгортці
    if (window.confirm(`Ви впевнені, що хочете видалити віджет "${component.label || component.id}"?`)) {
      onDelete(component.id);
    }
  };

  const handleClick = (e) => { // <--- НОВИЙ ОБРОБНИК КЛІКУ
    // Перевіряємо, чи клік був на елементі, який не є кнопкою управління
    // та чи ми в режимі блокування (lockMode), де клік означає дію, а не редагування
    if (onClick && lockMode && !e.target.closest('.widget-no-drag')) { 
      onClick(component);
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        cursor: (onClick && lockMode) ? 'pointer' : 'default', // Змінюємо курсор при lockMode, якщо є onClick
      }}
      onClick={handleClick} // <--- ДОДАЄМО ОБРОБНИК КЛІКУ НА PAPER
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