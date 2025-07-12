// src/components/AppLayoutParts/useDashboardManager.js
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useDashboardManager = (appConfig, setAppConfig, currentDashboardId) => {
  const navigate = useNavigate();
  const [newDashTitle, setNewDashTitle] = useState('');
  const [renameDashInfo, setRenameDashInfo] = useState({ open: false, id: null, name: '' });
  const [dashMenuAnchorEl, setDashMenuAnchorEl] = useState(null);
  const [activeDashIdForMenu, setActiveDashIdForMenu] = useState(null);

  const handleAddDashboard = useCallback(() => {
    if (newDashTitle.trim()) {
      const newId = `dashboard-${Date.now()}`;
      setAppConfig((p) => ({
        ...p,
        dashboards: {
          ...p.dashboards,
          [newId]: { title: newDashTitle.trim(), components: [] },
        },
      }));
      navigate(`/${newId}`);
      setNewDashTitle('');
    }
  }, [newDashTitle, setAppConfig, navigate]);

  const handleRenameDashboard = useCallback(() => {
    if (renameDashInfo.id && renameDashInfo.name.trim()) {
      setAppConfig((prev) => {
        const updatedDashboards = { ...prev.dashboards };
        updatedDashboards[renameDashInfo.id].title = renameDashInfo.name.trim();
        return { ...prev, dashboards: updatedDashboards };
      });
      setRenameDashInfo({ open: false, id: null, name: '' });
    }
  }, [renameDashInfo, setAppConfig]);

  const handleDeleteDashboard = useCallback((dashboardId) => {
    if (dashboardId && Object.keys(appConfig.dashboards).length > 1) {
      setAppConfig((prev) => {
        const updated = { ...prev.dashboards };
        delete updated[dashboardId];
        if (currentDashboardId === dashboardId) {
          navigate(`/${Object.keys(updated)[0]}`);
        }
        return { ...prev, dashboards: updated };
      });
    }
  }, [appConfig.dashboards, currentDashboardId, setAppConfig, navigate]);

  const handleDashMenuOpen = useCallback((event, dashboardId) => {
    event.preventDefault();
    event.stopPropagation();
    setDashMenuAnchorEl(event.currentTarget);
    setActiveDashIdForMenu(dashboardId);
  }, []);

  const handleDashMenuClose = useCallback(() => {
    setDashMenuAnchorEl(null);
    setActiveDashIdForMenu(null);
  }, []);

  return {
    newDashTitle,
    setNewDashTitle,
    renameDashInfo,
    setRenameDashInfo,
    dashMenuAnchorEl,
    activeDashIdForMenu,
    handleAddDashboard,
    handleRenameDashboard,
    handleDeleteDashboard,
    handleDashMenuOpen,
    handleDashMenuClose,
  };
};
