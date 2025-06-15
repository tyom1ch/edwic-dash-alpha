// src/pages/DashboardPage.jsx
import React from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Paper } from "@mui/material";

// --- ДОДАЙТЕ ЦЕЙ ІМПОРТ ---
import SensorComponent from "../components/widgets/SensorComponent";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Функція для рендерингу віджетів на основі їх типу
const renderWidget = (component) => {
  switch (component.type) {
    case 'sensor':
      return <SensorComponent componentConfig={component} />;
    
    // Тут можна буде додати інші типи віджетів
    // case 'switch':
    //   return <SwitchComponent componentConfig={component} />;

    default:
      return (
        <Paper sx={{ p: 2, height: '100%' }}>
          Unknown component type: {component.type}
        </Paper>
      );
  }
};

const DashboardPage = ({
  dashboard,
  onEditComponent,
  onDeleteComponent,
  lockMode,
}) => {
  if (!dashboard) {
    return <div>Dashboard not found.</div>;
  }

  // Створюємо layout для react-grid-layout
  const layouts = {
    lg: dashboard.components.map((comp, i) => ({
      i: String(comp.id),
      x: (i % 4) * 3, // Базове розміщення
      y: Math.floor(i / 4) * 2,
      w: 3,
      h: 2,
      ...comp.layout,
    })),
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={100}
      isDraggable={!lockMode}
      isResizable={!lockMode}
    >
      {dashboard.components.map((component) => (
        <div key={String(component.id)}>
          {/* --- ВИКОРИСТОВУЄМО ФУНКЦІЮ-РЕНДЕРЕР --- */}
          {renderWidget(component)}
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};

export default DashboardPage;