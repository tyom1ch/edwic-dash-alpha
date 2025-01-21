import React from 'react';
import { Button } from '@mui/material';

const AddComponentButton = ({ setIsModalOpen }) => (
  <Button variant="contained" onClick={() => setIsModalOpen(true)} sx={{ mt: 3 }}>
    Add Component
  </Button>
);

export default AddComponentButton;
