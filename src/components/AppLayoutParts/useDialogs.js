// src/components/AppLayoutParts/useDialogs.js
import { useState, useCallback } from 'react';

export const useDialogs = (appConfig) => {
  const [isComponentModalOpen, setComponentModalOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isAddDashDialogOpen, setAddDashDialogOpen] = useState(false);
  const [editComponent, setEditComponent] = useState(null);

  const handleEditComponentClick = useCallback((id) => {
    const component = Object.values(appConfig.dashboards)
      .flatMap((d) => d.components)
      .find((c) => c.id === id);
    setEditComponent(component);
    setComponentModalOpen(true);
  }, [appConfig.dashboards]);

  const closeComponentDialog = useCallback(() => {
    setComponentModalOpen(false);
    setEditComponent(null);
  }, []);

  return {
    isComponentModalOpen,
    openComponentDialog: () => setComponentModalOpen(true),
    closeComponentDialog,
    isDiscoveryOpen,
    openDiscoveryDialog: () => setIsDiscoveryOpen(true),
    closeDiscoveryDialog: () => setIsDiscoveryOpen(false),
    isAddDashDialogOpen,
    openAddDashDialog: () => setAddDashDialogOpen(true),
    closeAddDashDialog: () => setAddDashDialogOpen(false),
    editComponent,
    handleEditComponentClick,
  };
};
