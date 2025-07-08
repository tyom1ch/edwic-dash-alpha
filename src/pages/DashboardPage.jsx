// src/pages/DashboardPage.jsx
import React, { useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import WidgetWrapper from "../components/widgets/WidgetWrapper";
import { getWidgetByType } from "../core/widgetRegistry";
import HistoryGraphDialog from "../components/HistoryGraphDialog";

const ResponsiveGridLayout = WidthProvider(Responsive);

const FallbackWidget = ({ componentConfig }) => (
  <div style={{ padding: '16px', border: '1px dashed grey', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <p>Невідомий віджет: {componentConfig.label} {componentConfig?.type?.type}</p>
  </div>
);

function DashboardPage({ 
  dashboard, 
  onEditComponent, 
  onDeleteComponent, 
  onLayoutChange = () => {},
  lockMode 
}) {
  const [isHistoryGraphOpen, setIsHistoryGraphOpen] = useState(false);
  const [selectedSensorWidget, setSelectedSensorWidget] = useState(null);

  if (!dashboard) {
    return <div>Dashboard not found.</div>;
  }

  if (!dashboard.components || dashboard.components.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>На цьому дашборді поки немає віджетів.</p>
        <p>Перейдіть в режим редагування (Settings Button - Unlock edit) та додайте новий віджет.</p>
      </div>
    );
  }

  const handleWidgetClick = (component) => {
    if (lockMode && component.type === "sensor") { 
      setSelectedSensorWidget(component);
      setIsHistoryGraphOpen(true);
    }
  };

  const handleCloseHistoryGraph = () => {
    setIsHistoryGraphOpen(false);
    setSelectedSensorWidget(null);
  };

  // --- ОНОВЛЕНА ЛОГІКА ГЕНЕРАЦІЇ РОЗКЛАДКИ ---
  const layouts = {
    lg: dashboard.components.map((comp, i) => {
      // 1. Отримуємо інформацію про тип віджета з реєстру
      const widgetInfo = getWidgetByType(comp.type);
      const defaultLayout = widgetInfo?.defaultLayout;

      // 2. Визначаємо layout з пріоритетами
      return {
        i: String(comp.id),
        
        // Позиція: беремо збережену, або генеруємо нову
        x: comp.layout?.x ?? (i % 4) * 3,
        y: comp.layout?.y ?? Math.floor(i / 4) * 2,

        // Розмір: беремо збережений, або з реєстру, або запасний
        w: comp.layout?.w ?? defaultLayout?.w ?? 2,
        h: comp.layout?.h ?? defaultLayout?.h ?? 2,

        // Мінімальний розмір: беремо з реєстру, або запасний
        minW: defaultLayout?.minW ?? 1,
        minH: defaultLayout?.minH ?? 1,

        maxW: defaultLayout?.maxW ?? 6,
        maxH: defaultLayout?.maxH ?? 6,
      };
    }),
  };

  return (
    <>
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
      >
        {dashboard.components.map((component) => {
          const WidgetToRender = getWidgetByType(component.type)?.component;

          return (
            <div key={String(component.id)}>
              <WidgetWrapper
                component={component}
                onEdit={() => onEditComponent(component.id)}
                onDelete={() => onDeleteComponent(component.id)}
                lockMode={lockMode}
                onClick={handleWidgetClick}
              >
                {WidgetToRender ? (
                  <WidgetToRender componentConfig={component} />
                ) : (
                  <FallbackWidget componentConfig={component} />
                )}
              </WidgetWrapper>
            </div>
          );
        })}
      </ResponsiveGridLayout>

      <HistoryGraphDialog
        isOpen={isHistoryGraphOpen}
        onClose={handleCloseHistoryGraph}
        sensorWidget={selectedSensorWidget}
      />
    </>
  );
}

export default DashboardPage;