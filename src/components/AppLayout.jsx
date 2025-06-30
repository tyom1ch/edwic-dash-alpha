// src/components/AppLayout.jsx
import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { 
  createTheme, 
  Box, 
  IconButton, 
  Typography, 
  Button,
  TextField, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle 
} from "@mui/material";
import { AppProvider, DashboardLayout } from "@toolpad/core";
import { Add, AddBox, MoreVert, Settings, Dashboard as DashboardIcon, TravelExplore } from "@mui/icons-material";

import DashboardPage from "../pages/DashboardPage";
import SettingsPage from "../pages/SettingsPage";
import ComponentDialog from "./ComponentDialog";
import ModalDashSettings from "./ModalDashSettings";
import DiscoveryDialog from "./DiscoveryDialog";

// Цей компонент не потребує змін
function DashIcons({ lockMode, setLockMode, onAddClick, onDiscoveryClick, onDeleteDashboard }) {
    const [anchorEl, setAnchorEl] = useState(null);
    return (
        <>
            <IconButton title="Add widget manually" aria-label="add component" onClick={onAddClick}><Add /></IconButton>
            <IconButton title="Discover devices" aria-label="discover devices" onClick={onDiscoveryClick}><TravelExplore /></IconButton>
            <IconButton aria-label="more options" onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVert /></IconButton>
            <ModalDashSettings
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                lockMode={lockMode}
                setLockMode={setLockMode}
                onDeleteDashboard={onDeleteDashboard}
            />
        </>
    );
}

function AppLayout({ appConfig, setAppConfig, globalConnectionStatus, handlers }) { // <--- 'handlers' тепер тут
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [editComponent, setEditComponent] = useState(null);
  const [lockMode, setLockMode] = useState(true);

  const [isAddDashDialogOpen, setAddDashDialogOpen] = useState(false);
  const [newDashTitle, setNewDashTitle] = useState("");

  const handleNavigation = (path) => {
    if (path === '/add-dash') {
      setAddDashDialogOpen(true);
    } else {
      navigate(path);
    }
  };

  const router = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      navigate: handleNavigation,
      pathname: location.pathname,
      searchParams: searchParams,
    };
  }, [navigate, location.pathname, location.search]);
  
  const handleCloseAddDashDialog = () => {
    setAddDashDialogOpen(false);
    setNewDashTitle("");
  };

  const handleAddDashboard = () => {
    if (newDashTitle.trim()) {
      const newId = `dashboard-${Date.now()}`;
      setAppConfig(p => ({ 
        ...p, 
        dashboards: { 
          ...p.dashboards, 
          [newId]: { title: newDashTitle.trim(), components: [] } 
        } 
      }));
      navigate(`/${newId}`);
      handleCloseAddDashDialog();
    }
  };

  useEffect(() => {
    if (location.pathname === '/' && Object.keys(appConfig.dashboards).length > 0) {
        navigate(`/${Object.keys(appConfig.dashboards)[0]}`);
    } else if (Object.keys(appConfig.dashboards).length === 0 && !location.pathname.startsWith('/settings')) {
        navigate('/settings');
    }
  }, [appConfig.dashboards, navigate, location.pathname]);

  const currentDashboardId = location.pathname.split("/")[1] || Object.keys(appConfig.dashboards)[0] || null;

  const handleDeleteDashboard = () => {
    if (currentDashboardId && Object.keys(appConfig.dashboards).length > 1) {
        setAppConfig(prev => {
            const updated = { ...prev.dashboards };
            delete updated[currentDashboardId];
            navigate(`/${Object.keys(updated)[0]}`);
            return { ...prev, dashboards: updated };
        });
    }
  };

  const handleEditComponentClick = (id) => {
    const component = Object.values(appConfig.dashboards).flatMap(d => d.components).find(c => c.id === id);
    setEditComponent(component);
    setIsModalOpen(true);
  };

  const handleLayoutChange = (newLayout) => {
    if (!currentDashboardId) return;

    setAppConfig(prev => {
      if (!prev.dashboards[currentDashboardId]) return prev;
      
      const updatedDashboards = { ...prev.dashboards };
      const updatedDashboard = { ...updatedDashboards[currentDashboardId] };

      updatedDashboard.components = updatedDashboard.components.map(component => {
        const layoutItem = newLayout.find(item => String(item.i) === String(component.id));
        if (layoutItem) {
          return { ...component, layout: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h } };
        }
        return component;
      });
      updatedDashboards[currentDashboardId] = updatedDashboard;
      
      return { ...prev, dashboards: updatedDashboards };
    });
  };
  
  // Визначаємо демо-тему всередині AppLayout, оскільки AppProvider тут
  const demoTheme = createTheme({
    cssVariables: { colorSchemeSelector: 'data-toolpad-color-scheme' },
    colorSchemes: { light: true, dark: true },
  });

  return (
    <AppProvider
      theme={demoTheme}
      router={router}
      branding={{ logo: <img src="https://mui.com/static/logo.png" alt="MUI logo" />, title: "EdwIC" }}
      navigation={[
        { kind: "header", title: "Мої дашборди" },
        ...Object.entries(appConfig.dashboards).map(([id, { title }]) => ({ segment: id, icon: <DashboardIcon />, title })),
        { kind: "divider" },
        { segment: "add-dash", title: "Додати дашборд", icon: <AddBox /> },
        { segment: "settings", title: "Налаштування", icon: <Settings /> },
      ]}
    >
      <DashboardLayout
        slots={{
          toolbarActions: () => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" component="span" sx={{ color: globalConnectionStatus === "All online" ? "success.main" : "error.main" }}>
                {globalConnectionStatus}
              </Typography>
              {!location.pathname.startsWith("/settings") && (
                <DashIcons
                  lockMode={lockMode}
                  setLockMode={setLockMode}
                  onAddClick={() => setIsModalOpen(true)}
                  onDiscoveryClick={() => setIsDiscoveryOpen(true)}
                  onDeleteDashboard={handleDeleteDashboard}
                />
              )}
            </Box>
          ),
        }}
      >
        <Routes>
          {Object.keys(appConfig.dashboards).map(id => (
            <Route 
              key={id} 
              path={`/${id}`} 
              element={
                <DashboardPage 
                  dashboard={appConfig.dashboards[id]} 
                  onEditComponent={handleEditComponentClick} 
                  onDeleteComponent={handlers.handleDeleteComponent} 
                  onLayoutChange={handleLayoutChange} 
                  lockMode={lockMode} 
                />
              } 
            />
          ))}
          {/* --- ЗМІНА ТУТ --- */}
          <Route 
            path="/settings" 
            element={
              <SettingsPage 
                brokers={appConfig.brokers} 
                // Передаємо функцію handleSetBrokers з об'єкта handlers
                setBrokers={handlers.handleSetBrokers} 
              />
            } 
          />
          {/* --- КІНЕЦЬ ЗМІНИ --- */}
          <Route path="*" element={<div>404 - Сторінку не знайдено</div>} />
        </Routes>
      </DashboardLayout>

      <ComponentDialog 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditComponent(null); }} 
        onSave={handlers.handleSaveComponent} 
        onAdd={(newComp) => handlers.handleAddComponent(newComp, currentDashboardId)} 
        component={editComponent} 
        isEdit={!!editComponent} 
      />
      <DiscoveryDialog 
        isOpen={isDiscoveryOpen} 
        onClose={() => setIsDiscoveryOpen(false)} 
        onAddEntity={(entity) => handlers.handleAddComponent(entity, currentDashboardId)} 
      />
      <Dialog open={isAddDashDialogOpen} onClose={handleCloseAddDashDialog} fullWidth maxWidth="xs">
        <DialogTitle>Додати новий дашборд</DialogTitle>
        <DialogContent>
          <TextField 
            autoFocus 
            margin="dense" 
            label="Назва дашборду" 
            type="text" 
            fullWidth 
            variant="standard" 
            value={newDashTitle} 
            onChange={(e) => setNewDashTitle(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && handleAddDashboard()} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDashDialog}>Відмінити</Button>
          <Button onClick={handleAddDashboard} disabled={!newDashTitle.trim()}>Додати</Button>
        </DialogActions>
      </Dialog>
    </AppProvider>
  );
}

export default AppLayout;