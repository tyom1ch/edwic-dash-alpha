// frontend/src/pages/AlertRulesPage.jsx
import React from 'react';
import { Container, Typography } from '@mui/material';

function AlertRulesPage({ alertRules, onSetAlertRules }) { // Пропси з App.jsx
    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Це сторінка Налаштування Правил Алертів.
            </Typography>
            <Typography variant="body1">Правил алертів: {alertRules ? alertRules.length : 0}</Typography>
        </Container>
    );
}

export default AlertRulesPage;