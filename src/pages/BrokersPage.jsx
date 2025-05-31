// frontend/src/pages/BrokersPage.jsx
import React from 'react';
import { Container, Typography } from '@mui/material';

function BrokersPage({ brokers, setBrokers }) {
    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Це сторінка Налаштування Брокерів.
            </Typography>
            {/* Тимчасовий вивід для перевірки */}
            <Typography variant="body1">Брокерів: {brokers ? brokers.length : 0}</Typography>
        </Container>
    );
}

export default BrokersPage;