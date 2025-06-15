// src/pages/DashboardPage.jsx
import React from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import WidgetWrapper from "../components/WidgetWrapper";
import SensorComponent from "../components/widgets/SensorComponent";
import SwitchComponent from "../components/widgets/SwitchComponent";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Тепер ця функція повертає тільки "начинку" віджета
const renderWidgetContent = (component) => {
  switch (component.type) {
    case 'sensor':
      return <SensorComponent componentConfig={component} />;
    
    case 'switch':
      return <SwitchComponent componentConfig={component} />;

    default:
      return <div>Unknown component type: {component.type}</div>;
  }
};

const DashboardPage = ({
  dashboard,
  onEditComponent,
  onDeleteComponent,
  // --- ДОДАНО ЗНАЧЕННЯ ЗА ЗАМОВЧУВАННЯМ ---
  onLayoutChange = () => {}, 
  lockMode,
}) => {
  if (!dashboard) {
    return <div>Dashboard not found.</div>;
  }

  // Генерація початкової розкладки з урахуванням збережених даних
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
      // Тепер onLayoutChange ніколи не буде undefined, тому помилки не виникне
      onLayoutChange={(layout) => onLayoutChange(layout)}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={100}
      isDraggable={!lockMode}
      isResizable={!lockMode}
      draggableCancel=".widget-no-drag"
      draggableHandle=".widget-header"
    >
      {dashboard.components.map((component) => (
        <div key={String(component.id)}>
          <WidgetWrapper
            component={component}
            onEdit={onEditComponent}
            onDelete={onDeleteComponent}
            lockMode={lockMode}
          >
            {renderWidgetContent(component)}
          </WidgetWrapper>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};

export default DashboardPage;