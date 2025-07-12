// src/components/AppLayoutParts/AppToolbar.jsx
import React from 'react';
import { Box, Button, IconButton, Tooltip, Stack, Typography } from '@mui/material';
import {
  Add,
  TravelExplore,
  Edit,
  CheckRounded,
  CloudDone,
  CloudOff,
} from '@mui/icons-material';

const StatusIcon = ({ status }) => {
  const isOnline = status === 'All online';
  return (
    <Tooltip title={status}>
      <StatusIcon color={isOnline ? 'success' : 'error'} />
    </Tooltip>
  );
};

const CustomAppTitle = ({ status }) => (
  <Stack direction="row" alignItems="center" spacing={2}>
    <Typography variant="h6">EdwIC</Typography>
    <StatusIcon status={status} />
  </Stack>
);

export const AppToolbar = ({
  isEditMode,
  setIsEditMode,
  openComponentDialog,
  openDiscoveryDialog,
  isSettingsPage,
}) => {
  if (isSettingsPage) {
    return null;
  }

  return isEditMode ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title="Додати віджет">
        <IconButton onClick={openComponentDialog}>
          <Add />
        </IconButton>
      </Tooltip>
      <Tooltip title="Пошук пристроїв">
        <IconButton onClick={openDiscoveryDialog}>
          <TravelExplore />
        </IconButton>
      </Tooltip>
      <Button
        variant="contained"
        startIcon={<CheckRounded />}
        onClick={() => setIsEditMode(false)}
        size="small"
      >
        Готово
      </Button>
    </Box>
  ) : (
    <Tooltip title="Редагувати дашборд">
      <IconButton onClick={() => setIsEditMode(true)}>
        <Edit />
      </IconButton>
    </Tooltip>
  );
};

export const AppTitle = ({ status }) => (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Typography variant="h6">EdwIC</Typography>
      <Tooltip title={status}>
        {status === 'All online' ? <CloudDone color="success" /> : <CloudOff color="error" />}
      </Tooltip>
    </Stack>
  );
