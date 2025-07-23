// src/components/widgets/CoverComponent.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Slider } from '@mui/material';
import { ArrowUpward, ArrowDownward, Stop } from '@mui/icons-material';
import useEntity from '../../hooks/useEntity';
import commandDispatcher from '../../core/CommandDispatcher';

const CoverComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  const {
    payload_open = 'OPEN',
    payload_close = 'CLOSE',
    payload_stop = 'STOP',
  } = componentConfig;

  const state = entity?.state; // 'open', 'closed', 'opening', 'closing', 'stopped'
  const position = entity?.position; // Число від 0 до 100

  // --- LOCAL STATE FOR SLIDER ---
  const [sliderValue, setSliderValue] = useState(null);

  useEffect(() => {
    if (typeof position === 'number') {
      setSliderValue(position);
    } else {
      setSliderValue(null);
    }
  }, [position]);
  // --- END LOCAL STATE ---

  const isReady = typeof state !== 'undefined';
  const isOpen = state === 'open';
  const isClosed = state === 'closed';
  
  const hasPositionControl = typeof position !== 'undefined';

  const sendCommand = (value) => {
    commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_command', value });
  };

  const handleSetPosition = (event, newValue) => {
    commandDispatcher.dispatch({ entityId: componentConfig.id, commandKey: 'set_position', value: newValue });
  };

  const handleSliderChange = (event, newValue) => {
    setSliderValue(newValue); // Update local state immediately
  };

  const getStateText = () => {
    if (!isReady) return "---";
    const translations = {
        open: 'Відчинено',
        closed: 'Зачинено',
        opening: 'Відчинення...',
        closing: 'Зачинення...',
        stopped: 'Зупинено',
    };
    return translations[state] || state;
  }

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', width: '100%', p: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Стан:</Typography>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>{getStateText()}</Typography>
        </Box>

        {hasPositionControl && (
          <Box sx={{ px: 1, mt: 2 }}>
             <Slider
                value={sliderValue ?? (typeof position === 'number' ? position : 0)}
                onChange={handleSliderChange}
                onChangeCommitted={handleSetPosition}
                min={0}
                max={100}
                step={1}
                disabled={!isReady}
                valueLabelDisplay="auto"
                marks={[{value: 0, label: 'Закрито'}, {value: 100, label: 'Відчинено'}]}
              />
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mt: 2 }}>
          <IconButton onClick={() => sendCommand(payload_open)} disabled={!isReady || isOpen}>
            <ArrowUpward fontSize="large" />
          </IconButton>
          <IconButton onClick={() => sendCommand(payload_stop)} disabled={!isReady}>
            <Stop fontSize="large" />
          </IconButton>
          <IconButton onClick={() => sendCommand(payload_close)} disabled={!isReady || isClosed}>
            <ArrowDownward fontSize="large" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CoverComponent;
