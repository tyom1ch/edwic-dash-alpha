import React from "react";
import { Box, Tooltip, Stack, Typography } from "@mui/material";
import { CloudDone, CloudOff, CloudSync } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export const ConnectionStatusIcon = ({ 
  globalStatus, 
  brokers = [], 
  brokerStatuses = {}, 
  brokerErrors = {} 
}) => {
  const navigate = useNavigate();

  // Determine color and icon based on global status
  let IconComponent = CloudDone;
  let iconColor = "success";
  let mainTooltip = "Всі брокери підключені";

  if (globalStatus === "partial") {
    iconColor = "warning";
    mainTooltip = "Часткове підключення";
  } else if (globalStatus === "connecting") {
    IconComponent = CloudSync;
    iconColor = "info";
    mainTooltip = "Підключення...";
  } else if (globalStatus === "offline" || globalStatus === "error") {
    IconComponent = CloudOff;
    iconColor = "error";
    mainTooltip = "Відключено від брокерів";
  }

  // Generate detailed tooltip content
  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 0.5 }}>
        Статус брокерів
      </Typography>
      {brokers.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Брокери не налаштовані
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {brokers.map((broker) => {
            const status = brokerStatuses[broker.id] || "offline";
            const errorMsg = brokerErrors[broker.id];
            
            let statusDotColor = "#f44336"; // error/offline
            let statusText = "Відключено";
            
            if (status === "connected") {
              statusDotColor = "#4caf50";
              statusText = "Підключено";
            } else if (status === "connecting" || status === "reconnecting") {
              statusDotColor = "#2196f3";
              statusText = "З'єднання...";
            } else if (status === "error") {
              statusText = "Помилка";
            }

            return (
              <Box key={broker.id} sx={{ display: 'flex', flexDirection: 'column', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: statusDotColor }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {broker.title || broker.host}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({statusText})
                  </Typography>
                </Box>
                {errorMsg && (
                  <Typography variant="caption" color="error" sx={{ ml: 2, display: 'block' }}>
                    {errorMsg}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="bottom">
      <Box 
        onClick={() => navigate('/settings')}
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
      >
        <IconComponent color={iconColor} />
      </Box>
    </Tooltip>
  );
};

export default ConnectionStatusIcon;
