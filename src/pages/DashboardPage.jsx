// src/pages/DashboardPage.jsx
import React, { useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Переконаймося, що імпорти правильні
import WidgetWrapper from "../components/WidgetWrapper";
import { getWidgetByType } from "../core/widgetRegistry"; // Використовуємо правильний шлях
import HistoryGraphDialog from "../components/HistoryGraphDialog";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Заглушка, якщо компонент віджета не знайдено
const FallbackWidget = ({ componentConfig }) => (
  <div style={{ padding: '16px', border: '1px dashed grey', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <p>Невідомий віджет: {componentConfig.label} ({componentConfig.type})</p>
  </div>
);

function DashboardPage({ 
  dashboard, 
  onEditComponent, 
  onDeleteComponent, 
  onLayoutChange = () => {}, // Додаємо значення за замовчуванням
  lockMode 
}) {
  // --- СТАН ДЛЯ МОДАЛЬНОГО ВІКНА ГРАФІКА ---
  const [isHistoryGraphOpen, setIsHistoryGraphOpen] = useState(false);
  const [selectedSensorWidget, setSelectedSensorWidget] = useState(null);
  // --------------------------------------------------

  // Перевіряємо, чи дашборд існує
  if (!dashboard) {
    return <div>Dashboard not found.</div>;
  }

  // Перевіряємо, чи дашборд існує і містить компоненти
  if (!dashboard.components || dashboard.components.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>На цьому дашборді поки немає віджетів.</p>
        <p>Перейдіть в режим редагування (Settings Button - Unlock edit) та додайте новий віджет.</p>
      </div>
    );
  }

  // --- ОБРОБНИК КЛІКУ ДЛЯ ВІДЖЕТА ---
  const handleWidgetClick = (component) => {
    // Перевіряємо, чи ми в режимі перегляду (lockMode) і чи тип віджета - 'sensor'
    if (lockMode && component.type === "sensor") { 
      setSelectedSensorWidget(component);
      setIsHistoryGraphOpen(true);
    }
  };

  const handleCloseHistoryGraph = () => {
    setIsHistoryGraphOpen(false);
    setSelectedSensorWidget(null);
  };

  // --- ГЕНЕРАЦІЯ РОЗКЛАДКИ З ВАШОГО ОРИГІНАЛЬНОГО КОДУ ---
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
    <>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={(layout) => onLayoutChange(layout)}
        // --- БЕРЕМО БРЕЙКПОІНТИ З ВАШОГО ОРИГІНАЛЬНОГО КОДУ ---
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        // ----------------------------------------------------------
        rowHeight={100}
        isDraggable={!lockMode}
        isResizable={!lockMode}
        draggableCancel=".widget-no-drag"
        draggableHandle=".widget-header"
      >
        {dashboard.components.map((component) => {
          // Динамічно знаходимо компонент для рендерингу
          const WidgetToRender = getWidgetByType(component.type)?.component;

          return (
            <div key={String(component.id)}>
              <WidgetWrapper
                component={component}
                onEdit={() => onEditComponent(component.id)}
                onDelete={() => onDeleteComponent(component.id)}
                lockMode={lockMode}
                onClick={handleWidgetClick} // <--- ПЕРЕДАЄМО ОБРОБНИК КЛІКУ
              >
                {WidgetToRender ? (
                  <WidgetToRender componentConfig={component} />
                ) : (
                  <FallbackWidget componentConfig={component} /> // Використовуємо fallback
                )}
              </WidgetWrapper>
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {/* --- МОДАЛЬНЕ ВІКНО ГРАФІКА --- */}
      <HistoryGraphDialog
        isOpen={isHistoryGraphOpen}
        onClose={handleCloseHistoryGraph}
        sensorWidget={selectedSensorWidget}
      />
    </>
  );
}

export default DashboardPage;