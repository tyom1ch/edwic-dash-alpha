import React, { useState } from "react";
import { Box } from "@mui/material";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

import WidgetWrapper from "../components/widgets/WidgetWrapper";
import { getWidgetById } from "../core/widgetRegistry";
import HistoryGraphDialog from "../components/HistoryGraphDialog";

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

  // --- ТИМЧАСОВЕ ВІДКЛЮЧЕННЯ DND-KIT ДЛЯ ДІАГНОСТИКИ ---
  // const sensors = ...


  if (!dashboard) {
    return <div>Dashboard not found.</div>;
  }

  if (!dashboard.components || dashboard.components.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>На цьому дашборді поки немає віджетів.</p>
        <p>Перейдіть в режим редагування, та додайте новий віджет.</p>
        <p>Або імпортуйте дані на сторінці налаштувань.</p>
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

  // ЛОГІКА ПЕРЕСОРТУВАННЯ
  const handleDragEnd = (event) => {
    // В тимчасовому режимі перетягування не працює
  };

  return (
    <>
      <Box sx={{ p: 2, pb: 10 }}>
          <Box
            sx={{
              display: "grid",
              // Адаптивна сітка: колонки мінімум 140px, розширюються рівномірно
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gridAutoRows: "minmax(140px, auto)",
              gap: 2,
            }}
          >
            {dashboard.components.map((component) => {
              const WidgetToRender = getWidgetById(component.type)?.component;

              return (
                <WidgetWrapper
                  key={String(component.id)}
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
              );
            })}
          </Box>
      </Box>

      <HistoryGraphDialog
        isOpen={isHistoryGraphOpen}
        onClose={handleCloseHistoryGraph}
        sensorWidget={selectedSensorWidget}
      />
    </>
  );
}

export default DashboardPage;