import React, { useState } from 'react';
import { Grid, Button, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import CustomComponent from './CustomComponent';
import useLocalStorage from '../hooks/useLocalStorage';
import TopicTreeViewer from './TopicTreeViewer';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ComponentDialog from './ComponentDialog';

const Dashboard = () => {
  const [components, setComponents] = useLocalStorage('dashboardComponents', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editComponent, setEditComponent] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedComponentId, setSelectedComponentId] = useState(null);

  const handleAddComponent = (newComponent) => {
    if (editComponent) {
      // Якщо редагується існуючий компонент, оновлюємо його
      const updatedComponents = components.map((component) =>
        component.id === editComponent.id ? { ...newComponent, id: component.id } : component
      );
      setComponents(updatedComponents);
      setEditComponent(null); // Очищуємо стан редагування
    } else {
      // Додаємо новий компонент
      setComponents([...components, { ...newComponent, id: Date.now() }]);
    }
    setIsModalOpen(false);
  };

  const handleEditComponent = (id) => {
    const component = components.find((c) => c.id === id);
    setEditComponent(component);
    setIsModalOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteComponent = (id) => {
    const updatedComponents = components.filter((component) => component.id !== id);
    setComponents(updatedComponents);
    setAnchorEl(null);
  };

  const handleMenuOpen = (event, id) => {
    setAnchorEl(event.currentTarget);
    setSelectedComponentId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h3" gutterBottom align="center">
        MQTT дашморда)
      </Typography>
      <Grid container spacing={2}>
        {components.map((component) => (
          <Grid item xs={12} sm={6} md={4} key={component.id} style={{ position: 'relative' }}>
            <CustomComponent type={component.type} props={component} />
            <IconButton
              onClick={(e) => handleMenuOpen(e, component.id)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={selectedComponentId === component.id && anchorEl !== null}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={() => handleEditComponent(component.id)}>Редагувати</MenuItem>
              <MenuItem onClick={() => handleDeleteComponent(component.id)}>Видалити</MenuItem>
            </Menu>
          </Grid>
        ))}
      </Grid>

      <Button
        variant="contained"
        color="primary"
        onClick={() => setIsModalOpen(true)}
        sx={{ mt: 3 }}
      >
        Додати компонент
      </Button>

      <Grid item xs={12} md={4}>
        <TopicTreeViewer components={components} setComponents={setComponents} />
      </Grid>

      <ComponentDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddComponent}
        component={editComponent}
        isEdit={editComponent !== null}
      />
    </div>
  );
};

export default Dashboard;
