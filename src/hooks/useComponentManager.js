import { useCallback } from "react";

export const useComponentManager = (setAppConfig, currentDashboardId, handlers) => {
  const handleLayoutChange = useCallback(
    (newComponentsArray) => {
      if (!currentDashboardId) return;
      setAppConfig((prev) => {
        if (!prev.dashboards[currentDashboardId]) return prev;
        const updatedDashboards = { ...prev.dashboards };
        const updatedDashboard = { ...updatedDashboards[currentDashboardId] };
        
        // В новій системі DND (hello-pangea) розміщення будується через CSS Grid/Flex
        // Тому ми просто зберігаємо новий порядок масиву віджетів
        updatedDashboard.components = newComponentsArray;
        updatedDashboards[currentDashboardId] = updatedDashboard;
        return { ...prev, dashboards: updatedDashboards };
      });
    },
    [currentDashboardId, setAppConfig]
  );

  const handleAddComponent = useCallback(
    (newComponent) => {
      handlers.handleAddComponent(newComponent, currentDashboardId);
    },
    [handlers, currentDashboardId]
  );

  return {
    handleLayoutChange,
    handleAddComponent,
    handleSaveComponent: handlers.handleSaveComponent,
    handleDeleteComponent: handlers.handleDeleteComponent,
  };
};
