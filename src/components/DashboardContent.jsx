import React from 'react';
import { Grid, Typography, Button } from '@mui/material';
import CustomComponent from './CustomComponent';
import EntityManagerDebug from './EntityManagerDebug';

const DashboardContent = ({ activeDashboard, handleAddComponent, setIsModalOpen, setEditComponent }) => (
  <div style={{ flex: 1, padding: '20px' }}>
    <Typography variant="h4" gutterBottom>
      {activeDashboard ? activeDashboard.name : 'No Active Dashboard'}
    </Typography>
    {activeDashboard ? (
      <>
        <Grid container spacing={2}>
          {activeDashboard.components.map((component) => (
            <Grid item xs={12} sm={6} md={4} key={component.id}>
              <CustomComponent type={component.type} props={component} />
            </Grid>
          ))}
        </Grid>
        <Button variant="contained" onClick={() => setIsModalOpen(true)} sx={{ mt: 3 }}>
          Add Component
        </Button>
        <EntityManagerDebug onAddComponent={handleAddComponent} />
      </>
    ) : (
      <Typography variant="body1">Please create or select a dashboard.</Typography>
    )}
  </div>
);

export default DashboardContent;
