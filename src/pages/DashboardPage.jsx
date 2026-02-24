import React, { useState } from "react";
import { Box } from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    if (result.source.index === result.destination.index) {
      return;
    }

    const items = Array.from(dashboard.components);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onLayoutChange(items);
  };

  return (
    <>
      <Box sx={{ p: 2, pb: 10 }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="dashboard-grid" direction="horizontal">
              {(provided) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    display: "grid",
                    // Адаптивна сітка: колонки мінімум 140px, розширюються рівномірно. hello-pangea добре справляється з grid, якщо direction=horizontal і включені transition.
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gridAutoRows: "minmax(140px, auto)",
                    gap: 2,
                  }}
                >
                  {dashboard.components.map((component, index) => {
                    const WidgetToRender = getWidgetById(component.type)?.component;

                    return (
                      <Draggable
                        key={String(component.id)}
                        draggableId={String(component.id)}
                        index={index}
                        isDragDisabled={lockMode} // Перетягування вимкнено, якщо дашборд заблокований. Тобто доступне тільки в Edit Mode (lockMode = false)
                      >
                        {(provided, snapshot) => (
                          <WidgetWrapper
                            component={component}
                            onEdit={() => onEditComponent(component.id)}
                            onDelete={() => onDeleteComponent(component.id)}
                            lockMode={lockMode}
                            onClick={handleWidgetClick}
                            provided={provided} // Передаємо пропси hello-pangea вниз
                            isDragging={snapshot.isDragging}
                          >
                            {WidgetToRender ? (
                              <WidgetToRender componentConfig={component} />
                            ) : (
                              <FallbackWidget componentConfig={component} />
                            )}
                          </WidgetWrapper>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>
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