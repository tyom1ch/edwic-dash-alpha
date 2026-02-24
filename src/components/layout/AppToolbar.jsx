import React from "react";
import { Box, Button, IconButton, Tooltip, Stack, Typography } from "@mui/material";
import { CheckRounded, Add, TravelExplore, Edit } from "@mui/icons-material";
import ConnectionStatusIcon from "./ConnectionStatusIcon";

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
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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

export const AppTitle = ({ status, brokers, brokerStatuses, brokerErrors }) => (
  <Stack direction="row" alignItems="center" spacing={2}>
    <Typography variant="h6">EdwIC</Typography>
    <ConnectionStatusIcon 
      globalStatus={status} 
      brokers={brokers} 
      brokerStatuses={brokerStatuses} 
      brokerErrors={brokerErrors} 
    />
  </Stack>
);
