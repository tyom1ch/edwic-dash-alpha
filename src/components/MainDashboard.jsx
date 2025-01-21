import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createTheme } from '@mui/material/styles';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import useSimpleRouter from '../hooks/useSimpleRouter';
import { Grid, IconButton, Menu, MenuItem, Button } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ComponentDialog from './ComponentDialog';
import CustomComponent from './CustomComponent';
import { useState } from 'react';
import EntityManagerDebug from './EntityManagerDebug';
import useLocalStorage from '../hooks/useLocalStorage';

const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: true },
});

function DashboardContent({
  dashboards,
  currentDashboardId,
  onAddComponent,
  onEditComponent,
  onDeleteComponent,
  onAddDashboard,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedComponentId, setSelectedComponentId] = useState(null);

  const handleMenuOpen = (event, id) => {
    setAnchorEl(event.currentTarget);
    setSelectedComponentId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const currentDashboard = dashboards[currentDashboardId];

  if (!currentDashboard) {
    return <Typography variant="h6">Дашборд не знайдено</Typography>;
  }

  return (
    <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <Typography>{currentDashboard.title}</Typography>
      <Button
        onClick={() => onAddDashboard('New Dashboard')}
        variant="contained"
        color="primary"
        sx={{ marginBottom: 2 }}
      >
        Додати новий дашборд
      </Button>

      <Grid container spacing={2}>
        {currentDashboard.components.map((component) => (
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
              <MenuItem onClick={() => onEditComponent(component.id)}>Редагувати</MenuItem>
              <MenuItem onClick={() => onDeleteComponent(component.id)}>Видалити</MenuItem>
            </Menu>
          </Grid>
        ))}
      </Grid>
      <Button onClick={() => onAddComponent(currentDashboardId, { type: 'newComponentType', content: 'New Component' })}>
        Додати компонент
      </Button>
      <EntityManagerDebug onAddComponent={(component) => onAddComponent(currentDashboardId, component)} />
    </Box>
  );
}

function MainDashboard(props) {
  const { window } = props;
  const router = useSimpleRouter('/home');
  const [dashboards, setDashboards] = useLocalStorage('dashboards', {
    'dashboard-1': {
      title: 'Default Dashboard',
      components: [],
    },
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editComponent, setEditComponent] = useState(null);

  const handleAddDashboard = (title) => {
    const newDashboardId = `dashboard-${Date.now()}`;
    setDashboards((prevState) => ({
      ...prevState,
      [newDashboardId]: {
        title,
        components: [],
      },
    }));
  };

  const handleAddComponent = (dashboardId, newComponent) => {
    setDashboards((prevState) => {
      const updatedDashboards = { ...prevState };
      if (updatedDashboards[dashboardId]) {
        updatedDashboards[dashboardId].components.push({ ...newComponent, id: Date.now() });
      }
      return updatedDashboards;
    });
  };

  const handleEditComponent = (id) => {
    const component = Object.values(dashboards)
      .flatMap((dashboard) => dashboard.components)
      .find((comp) => comp.id === id);
    setEditComponent(component);
    setIsModalOpen(true);
  };

  const handleDeleteComponent = (id) => {
    setDashboards((prevState) => {
      const updatedDashboards = { ...prevState };
      Object.keys(updatedDashboards).forEach((dashboardId) => {
        updatedDashboards[dashboardId].components = updatedDashboards[dashboardId].components.filter(
          (comp) => comp.id !== id
        );
      });
      return updatedDashboards;
    });
  };

  // Отримуємо ID дашборду з роута
// Заміна на router.pathname
const currentDashboardId = router.pathname.split('/')[1] || 'dashboard-1';

  return (
    <AppProvider
      navigation={[
        {
          kind: 'header',
          title: 'Dashboards',
        },
        ...Object.entries(dashboards).map(([id, { title }]) => ({
          segment: id,
          title,
        })),
      ]}
      branding={{
        logo: <img src="https://mui.com/static/logo.png" alt="MUI logo" />,
        title: 'EdwIC',
      }}
      router={router}
      theme={demoTheme}
      window={window}
    >
      <DashboardLayout>
        <DashboardContent
          dashboards={dashboards}
          currentDashboardId={currentDashboardId}
          onAddComponent={handleAddComponent}
          onEditComponent={handleEditComponent}
          onDeleteComponent={handleDeleteComponent}
          onAddDashboard={handleAddDashboard}
        />
      </DashboardLayout>
      <ComponentDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={null}
        component={editComponent}
        isEdit={editComponent !== null}
      />
    </AppProvider>
  );
}

export default MainDashboard;
