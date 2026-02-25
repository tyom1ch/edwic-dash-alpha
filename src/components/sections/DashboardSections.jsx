// src/components/sections/DashboardSections.jsx
// dnd-kit DndContext — vertical HA-style sections layout, DragOverlay ghost card
import React, { useState, useCallback } from "react";
import { Box } from "@mui/material";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import SectionColumn from "./SectionColumn";
import WidgetWrapper from "../widgets/WidgetWrapper";
import { getWidgetById } from "../../core/widgetRegistry";

// ─── DragOverlay ghost card ──────────────────────────────────────────────────
// Renders a visual copy of the dragged card while it is in flight.
function GhostCard({ card }) {
  if (!card) return null;
  const WidgetComp = getWidgetById(card.type)?.component;
  const go = card.grid_options || { columns: 1, rows: 1 };
  const GRID_COLS = 4;
  const ROW_HEIGHT = 56;
  const GAP = 8;
  const cols = go.columns === "full" ? GRID_COLS : Math.min(go.columns ?? 1, GRID_COLS);
  const rows = go.rows === "auto" ? 1 : (go.rows ?? 1);

  // Extract rect from active card for precise sizing
  const width = card.rect?.width || `calc(${(cols / GRID_COLS) * 100}% - ${GAP}px)`;
  const height = card.rect?.height || `${rows * ROW_HEIGHT + (rows - 1) * GAP}px`;

  return (
    <Box
      sx={{
        width,
        height,
        borderRadius: "12px",
        opacity: 0.85,
        boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        transform: "scale(1.02)",
        transformOrigin: "center",
        pointerEvents: "none",
        overflow: "hidden",
        bgcolor: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(3,169,244,0.5)",
      }}
    >
      {WidgetComp ? (
        <WidgetComp componentConfig={card} />
      ) : (
        <Box sx={{ p: 1, color: "text.disabled", fontSize: "0.75rem" }}>
          {card.type}
        </Box>
      )}
    </Box>
  );
}

// ─── DashboardSections ───────────────────────────────────────────────────────
function DashboardSections({
  sections = [],
  lockMode,
  onEditWidget,
  onDeleteWidget,
  onWidgetClick,
  onAddWidget,
  onAddSection,
  onDeleteSection,
  onRenameSection,
  onLayoutChange,
  onDragEnd: handleDragEnd,  // from useComponentManager — (event, sections) => void
}) {
  // ── Active drag item (for DragOverlay) ────────────────────────────────────
  const [activeItem, setActiveItem] = useState(null);  // { type, id, card }

  // ── Sensors ───────────────────────────────────────────────────────────────
  // MouseSensor for desktop, TouchSensor for mobile with 250ms delay to allow scrolling
  // Custom filter: ignore drag on elements with .no-drag class or data-no-drag="true"
  const filterNoDrag = (event) => {
    return !event.target.closest('.no-drag, [data-no-drag="true"]');
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
      // Intercept activation on specific elements
      filter: filterNoDrag,
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
      filter: filterNoDrag,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Resize handler (unchanged from original) ──────────────────────────────
  const onResizeCard = useCallback((sectionId, cardId, deltaColumns, deltaRows) => {
    if (!deltaColumns && !deltaRows) return;
    const GRID_COLS = 4;
    const next = sections.map((s) => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        cards: s.cards.map((c) => {
          if (c.id !== cardId) return c;
          const go = c.grid_options || { columns: 1, rows: 1 };
          const curCols = go.columns === "full" ? GRID_COLS : (go.columns ?? 1);
          const curRows = go.rows === "auto" ? 1 : (go.rows ?? 1);
          return {
            ...c,
            grid_options: {
              ...go,
              columns: Math.min(GRID_COLS, Math.max(1, curCols + deltaColumns)),
              rows: Math.max(1, curRows + deltaRows),
            },
          };
        }),
      };
    });
    onLayoutChange(next);
  }, [sections, onLayoutChange]);

  // ── DragStart — record what is being dragged for the overlay ─────────────
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "card") {
      const card = sections
        .flatMap((s) => s.cards)
        .find((c) => c.id === active.id);
        
      // Ensure we grab its currently rendered dimensions from the DOM
      const cardEl = document.querySelector(`[data-card-id="${active.id}"]`);
      if (card && cardEl) {
        card.rect = cardEl.getBoundingClientRect();
      }

      setActiveItem({ type: "card", id: active.id, card });
    } else if (type === "section") {
      setActiveItem({ type: "section", id: active.id });
    }
  }, [sections]);

  // ── DragEnd — delegate to useComponentManager, clear overlay ─────────────
  const handleDragEndInternal = useCallback((event) => {
    setActiveItem(null);
    handleDragEnd(event, sections);
  }, [handleDragEnd, sections]);

  const handleDragCancel = useCallback(() => setActiveItem(null), []);

  // Section ids for the outer SortableContext
  const sectionIds = sections.map((s) => s.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndInternal}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      {/* ── Outer sortable: section reorder ─────────────────────────────── */}
      <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",   // ← HA-style: sections stack vertically
            gap: "12px",
            p: "8px",
            pb: 10,
          }}
        >
          {sections.map((section) => (
            <SectionColumn
              key={section.id}
              section={section}
              lockMode={lockMode}
              onEditCard={onEditWidget}
              onDeleteCard={onDeleteWidget}
              onCardClick={onWidgetClick}
              onAddCard={onAddWidget}
              onDelete={() => onDeleteSection(section.id)}
              onRename={(t) => onRenameSection(section.id, t)}
              onResizeCard={onResizeCard}
            />
          ))}

          {/* ── Add section placeholder ──────────────────────────────── */}
          {!lockMode && (
            <Box
              sx={{
                minHeight: 72,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                border: "1.5px dashed rgba(3,169,244,0.35)",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "background-color 0.15s, border-color 0.15s",
                "&:hover": {
                  backgroundColor: "rgba(3,169,244,0.06)",
                  borderColor: "rgba(3,169,244,0.6)",
                },
              }}
              onClick={onAddSection}
            >
              <Box sx={{ fontSize: 28, color: "rgba(3,169,244,0.5)", lineHeight: 1 }}>⊞</Box>
              <Box sx={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Додати секцію</Box>
            </Box>
          )}
        </Box>
      </SortableContext>

      {/* ── DragOverlay: ghost that follows the pointer ──────────────────── */}
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeItem?.type === "card" && <GhostCard card={activeItem.card} />}
        {activeItem?.type === "section" && (
          <Box
            sx={{
              height: 36,
              borderRadius: "10px",
              bgcolor: "rgba(3,169,244,0.12)",
              border: "1.5px solid rgba(3,169,244,0.4)",
              opacity: 0.85,
              pointerEvents: "none",
            }}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default DashboardSections;
