// frontend/src/pages/DashboardPage.jsx
import React from 'react';
import { Container, Typography } from '@mui/material';

function DashboardPage({ dashboard, onAddComponent, onSaveComponent, onDeleteComponent }) {
    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom>
                {dashboard ? dashboard.title : "Невідомий Дашборд"}
            </Typography>
            <Typography variant="body1">Тут буде вміст дашборда.</Typography>
        </Container>
    );
}

export default DashboardPage;