import React from "react";
import { Box, Button, IconButton, Tooltip, Stack, Typography } from "@mui/material";
import { CheckRounded, Add, TravelExplore, Edit } from "@mui/icons-material";
import ConnectionStatusIcon from "./ConnectionStatusIcon";
import { NotificationMenu } from "./NotificationMenu";

export const AppToolbar = ({
  isEditMode,
  setIsEditMode,
  openComponentDialog,
  openDiscoveryDialog,
  isSettingsPage,
}) => {
  if (isSettingsPage) {
    return (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <NotificationMenu />
      </Box>
    );
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
      <NotificationMenu />
    </Box>
  ) : (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Tooltip title="Редагувати дашборд">
        <IconButton onClick={() => setIsEditMode(true)}>
          <Edit />
        </IconButton>
      </Tooltip>
      <NotificationMenu />
    </Box>
  );
};

export const AppTitle = ({ status, brokers, brokerStatuses, brokerErrors }) => (
  <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1 }}>
    <Typography variant="h6">EdwIC</Typography>
    <ConnectionStatusIcon 
      globalStatus={status} 
      brokers={brokers} 
      brokerStatuses={brokerStatuses} 
      brokerErrors={brokerErrors} 
    />
  </Stack>
);

// We need to inject NotificationMenu into the header
// A better place is in AppToolbar but AppToolbar is right-aligned. Let's add it there or inside AppTitle.
// Actually, AppTitle is on the left, AppToolbar is on the right. It's better to put NotificationMenu in AppToolbar.
