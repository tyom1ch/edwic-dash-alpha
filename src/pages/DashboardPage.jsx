// src/pages/DashboardPage.jsx
import React from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import WidgetWrapper from "../components/WidgetWrapper";
import { getWidgetByType } from "../components/widgets/widgetRegistry"; 

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardPage = ({
  dashboard,
  onEditComponent,
  onDeleteComponent,
  onLayoutChange = () => {},
  lockMode,
}) => {
  if (!dashboard) {
    return <div>Dashboard not found.</div>;
  }

  // Генерація розкладки залишається без змін
  const layouts = {
    lg: dashboard.components.map((comp, i) => ({
      i: String(comp.id),
      x: comp.layout?.x ?? (i % 4) * 3,
      y: comp.layout?.y ?? Math.floor(i / 4) * 2,
      w: comp.layout?.w ?? 3,
      h: comp.layout?.h ?? 2,
    })),
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      onLayoutChange={(layout) => onLayoutChange(layout)}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={100}
      isDraggable={!lockMode}
      isResizable={!lockMode}
      draggableCancel=".widget-no-drag"
      draggableHandle=".widget-header"
    >
      {dashboard.components.map((component) => {
        // 3. Динамічно знаходимо компонент для рендерингу
        const WidgetToRender = getWidgetByType(component.type)?.component;

        return (
          <div key={String(component.id)}>
            <WidgetWrapper
              component={component}
              onEdit={() => onEditComponent(component.id)} // Передаємо ID для обробника
              onDelete={() => onDeleteComponent(component.id)} // Передаємо ID для обробника
              lockMode={lockMode}
            >
              {/* 4. Рендеримо знайдений компонент або заглушку */}
              {WidgetToRender ? (
                <WidgetToRender componentConfig={component} />
              ) : (
                <div>Unknown component type: {component.type}</div>
              )}
            </WidgetWrapper>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
};

export default DashboardPage;