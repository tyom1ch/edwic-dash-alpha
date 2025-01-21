import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import useLocalStorage from '../hooks/useLocalStorage';
import CustomComponent from './CustomComponent';

const DemoPageContent = () => {
  const { id } = useParams(); // Отримуємо `id` з URL
  const [dashboards] = useLocalStorage('dashboards', []); // Отримуємо дашборди з локального сховища

  const dashboard = dashboards.find(dashboard => dashboard.id === Number(id));

  if (!dashboard) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <Typography variant="h4" color="error">
          Dashboard not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        py: 4,
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="h4" gutterBottom>
        {dashboard.name || `Dashboard ${dashboard.id}`}
      </Typography>
      <Box>
        {dashboard.components.length > 0 ? (
          dashboard.components.map(component => (
            <CustomComponent key={component.id} type={component.type} props={component} />
          ))
        ) : (
          <Typography>No components added to this dashboard.</Typography>
        )}
      </Box>
    </Box>
  );
};

export default DemoPageContent;
