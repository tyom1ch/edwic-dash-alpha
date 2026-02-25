// src/pages/DashboardPage.jsx
import React, { useState } from "react";
import { Box, Typography } from "@mui/material";

import DashboardSections from "../components/sections/DashboardSections";
import HistoryGraphDialog from "../components/HistoryGraphDialog";

function DashboardPage({
  dashboard,
  onEditComponent,
  onDeleteComponent,
  onLayoutChange = () => {},  // (newSections) => void
  onDragEnd = () => {},       // (event, sections) => void
  onAddSection,
  onDeleteSection,
  onRenameSection,
  onAddComponentToSection,    // (sectionId) => void  — opens dialog scoped to that section
  lockMode,
}) {
  const [isHistoryGraphOpen, setIsHistoryGraphOpen] = useState(false);
  const [selectedSensorWidget, setSelectedSensorWidget] = useState(null);

  if (!dashboard) return <div>Dashboard not found.</div>;

  const sections = dashboard.sections || [];

  const isEmpty = sections.length === 0 || sections.every((s) => s.cards.length === 0);

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

  if (lockMode && isEmpty) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          На цьому дашборді поки немає віджетів.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Перейдіть в режим редагування, та додайте новий віджет.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <DashboardSections
        sections={sections}
        lockMode={lockMode}
        onEditWidget={onEditComponent}
        onDeleteWidget={onDeleteComponent}
        onWidgetClick={handleWidgetClick}
        onAddWidget={onAddComponentToSection}
        onAddSection={onAddSection}
        onDeleteSection={onDeleteSection}
        onRenameSection={onRenameSection}
        onLayoutChange={onLayoutChange}
        onDragEnd={onDragEnd}
      />

      <HistoryGraphDialog
        isOpen={isHistoryGraphOpen}
        onClose={handleCloseHistoryGraph}
        sensorWidget={selectedSensorWidget}
      />
    </>
  );
}

export default DashboardPage;