// frontend/src/components/AlertNotification.jsx
import React from 'react';
import { Box, Typography } from '@mui/material';

function AlertNotification() {
    return (
        <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, p: 2, bgcolor: 'background.paper', border: '1px solid #ccc' }}>
            <Typography variant="body1">Це сповіщення про алерт.</Typography>
        </Box>
    );
}

export default AlertNotification;