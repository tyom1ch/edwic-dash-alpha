// src/components/AppLayoutParts/useComponentManager.js
import { useCallback } from 'react';

export const useComponentManager = (setAppConfig, currentDashboardId, handlers) => {
  const handleLayoutChange = useCallback((newLayout) => {
    if (!currentDashboardId) return;
    setAppConfig((prev) => {
      if (!prev.dashboards[currentDashboardId]) return prev;
      const updatedDashboards = { ...prev.dashboards };
      const updatedDashboard = { ...updatedDashboards[currentDashboardId] };
      updatedDashboard.components = updatedDashboard.components.map(
        (component) => {
          const layoutItem = newLayout.find(
            (item) => String(item.i) === String(component.id)
          );
          return layoutItem
            ? {
                ...component,
                layout: {
                  x: layoutItem.x,
                  y: layoutItem.y,
                  w: layoutItem.w,
                  h: layoutItem.h,
                },
              }
            : component;
        }
      );
      updatedDashboards[currentDashboardId] = updatedDashboard;
      return { ...prev, dashboards: updatedDashboards };
    });
  }, [currentDashboardId, setAppConfig]);

  const handleAddComponent = useCallback((newComponent) => {
      handlers.handleAddComponent(newComponent, currentDashboardId)
  }, [handlers, currentDashboardId]);


  return {
    handleLayoutChange,
    handleAddComponent,
    handleSaveComponent: handlers.handleSaveComponent,
    handleDeleteComponent: handlers.handleDeleteComponent,
  };
};
