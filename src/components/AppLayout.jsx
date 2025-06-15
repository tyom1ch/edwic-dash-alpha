// src/components/AppLayout.jsx
import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { createTheme, Box, IconButton, Typography } from "@mui/material";
import { AppProvider, DashboardLayout } from "@toolpad/core";
import { Add, AddBox, MoreVert, Settings, Dashboard as DashboardIcon } from "@mui/icons-material";

import DashboardPage from "../pages/DashboardPage";
import SettingsPage from "../pages/SettingsPage";
import AlertRulesPage from "../pages/AlertRulesPage";
import ComponentDialog from "./ComponentDialog";
import ModalDashSettings from "./ModalDashSettings";

const demoTheme = createTheme({
    cssVariables: { colorSchemeSelector: 'data-toolpad-color-scheme' },
    colorSchemes: { light: true, dark: true },
});

// Міні-компонент для іконок в тулбарі
function DashIcons({ lockMode, setLockMode, onAddClick, onDeleteDashboard }) {
    const [anchorEl, setAnchorEl] = useState(null);
    return (
        <>
            <IconButton aria-label="add component" onClick={onAddClick}><Add /></IconButton>
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

function AppLayout({ appConfig, setAppConfig, globalConnectionStatus, ...handlers }) {
  const navigate = useNavigate();
  const location = useLocation();
  // --- ОСЬ ЦЕЙ БЛОК ОНОВЛЕНО ---
  const router = useMemo(() => {
    // Створюємо об'єкт URLSearchParams з рядка location.search.
    const searchParams = new URLSearchParams(location.search);
    return {
      navigate: (path) => navigate(path),
      pathname: location.pathname,
      // Додаємо відсутню властивість, яку очікує AppProvider.
      searchParams: searchParams,
    };
    // Додаємо location.search до масиву залежностей.
  }, [navigate, location.pathname, location.search]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editComponent, setEditComponent] = useState(null);
  const [lockMode, setLockMode] = useState(true);

  const currentDashboardId = location.pathname.split("/")[1] || Object.keys(appConfig.dashboards)[0] || "dashboard";

  // Навігація та керування дашбордами
  useEffect(() => {
    if (location.pathname === "/add-dash") {
      const title = prompt("Введіть назву нового дашборду:");
      if (title) {
        const newId = `dashboard-${Date.now()}`;
        setAppConfig(p => ({ ...p, dashboards: { ...p.dashboards, [newId]: { title, components: [] } } }));
        navigate(`/${newId}`);
      } else {
        navigate(-1);
      }
    }
  }, [location.pathname, navigate, setAppConfig]);

  useEffect(() => {
    if (location.pathname === '/' && Object.keys(appConfig.dashboards).length > 0) {
        navigate(`/${Object.keys(appConfig.dashboards)[0]}`);
    } else if (Object.keys(appConfig.dashboards).length === 0 && !location.pathname.startsWith('/settings')) {
        navigate('/settings');
    }
  }, [appConfig.dashboards, navigate, location.pathname]);

  const handleDeleteDashboard = () => {
    if (Object.keys(appConfig.dashboards).length > 1) {
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

  // --- ОБРОБНИК ДЛЯ ЗБЕРЕЖЕННЯ РОЗКЛАДКИ (ПОВНА РЕАЛІЗАЦІЯ) ---
  const handleLayoutChange = (newLayout) => {
    setAppConfig(prev => {
      if (!prev.dashboards[currentDashboardId]) {
        return prev;
      }
      
      const updatedDashboards = { ...prev.dashboards };
      const updatedDashboard = { ...updatedDashboards[currentDashboardId] };

      updatedDashboard.components = updatedDashboard.components.map(component => {
        const layoutItem = newLayout.find(item => String(item.i) === String(component.id));
        if (layoutItem) {
          return {
            ...component,
            layout: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            }
          };
        }
        return component;
      });

      updatedDashboards[currentDashboardId] = updatedDashboard;
      
      return { ...prev, dashboards: updatedDashboards };
    });
  };

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
                  // --- ОСЬ ТУТ МИ ПЕРЕДАЄМО ФУНКЦІЮ ---
                  onLayoutChange={handleLayoutChange} 
                  lockMode={lockMode} 
                />
              } 
            />
          ))}
          <Route path="/settings" element={<SettingsPage brokers={appConfig.brokers} setBrokers={handlers.handleSetBrokers} />} />
          <Route path="/settings/alerts" element={<AlertRulesPage alertRules={appConfig.alertRules} onSetAlertRules={handlers.handleSetAlertRules} />} />
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
    </AppProvider>
  );
}

export default AppLayout;