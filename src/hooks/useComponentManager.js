// src/hooks/useComponentManager.js
import { useCallback } from "react";
import { arrayMove } from "@dnd-kit/sortable";

export const useComponentManager = (setAppConfig, currentDashboardId, handlers) => {
  /**
   * Persists a new `sections[]` array for the current dashboard.
   * Called after any card/section reorder via dnd-kit's onDragEnd.
   */
  const handleLayoutChange = useCallback(
    (newSectionsArray) => {
      if (!currentDashboardId) return;
      setAppConfig((prev) => {
        if (!prev.dashboards[currentDashboardId]) return prev;
        const updatedDashboards = { ...prev.dashboards };
        updatedDashboards[currentDashboardId] = {
          ...updatedDashboards[currentDashboardId],
          sections: newSectionsArray,
        };
        return { ...prev, dashboards: updatedDashboards };
      });
    },
    [currentDashboardId, setAppConfig]
  );

  /**
   * dnd-kit DragEndEvent handler.
   * Handles three cases:
   *   1. Section reorder       — active.data.current.type === "section"
   *   2. Intra-section card    — active.data.current.type === "card", same section
   *   3. Cross-section card    — active.data.current.type === "card", different sections
   *
   * @param {import("@dnd-kit/core").DragEndEvent} event
   * @param {Array} sections  — current sections snapshot passed from DashboardSections
   */
  const handleDragEnd = useCallback(
    (event, sections) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeType = active.data.current?.type;

      // ── 1. Section reorder ────────────────────────────────────────────────
      if (activeType === "section") {
        const oldIndex = sections.findIndex((s) => s.id === active.id);
        const newIndex = sections.findIndex((s) => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        handleLayoutChange(arrayMove(sections, oldIndex, newIndex));
        return;
      }

      // ── 2 & 3. Card moves ─────────────────────────────────────────────────
      if (activeType === "card") {
        // Find which section currently holds the active card
        const activeSectionIndex = sections.findIndex((s) =>
          s.cards.some((c) => c.id === active.id)
        );
        if (activeSectionIndex === -1) return;

        // `over` can be another card OR a section container droppable
        // Section containers use id format "section-droppable-<sectionId>"
        const overIsSectionContainer = over.data.current?.type === "section-container";
        const overSectionIndex = overIsSectionContainer
          ? sections.findIndex((s) => s.id === over.data.current.sectionId)
          : sections.findIndex((s) => s.cards.some((c) => c.id === over.id));

        if (overSectionIndex === -1) return;

        const next = sections.map((s) => ({ ...s, cards: [...s.cards] }));
        const srcSec = next[activeSectionIndex];
        const dstSec = next[overSectionIndex];

        const activeCardIndex = srcSec.cards.findIndex((c) => c.id === active.id);

        if (activeSectionIndex === overSectionIndex) {
          // ── Intra-section ────────────────────────────────────────────────
          if (overIsSectionContainer) return; // dropped on same section container, no-op
          const overCardIndex = srcSec.cards.findIndex((c) => c.id === over.id);
          next[activeSectionIndex].cards = arrayMove(
            srcSec.cards,
            activeCardIndex,
            overCardIndex
          );
        } else {
          // ── Cross-section ────────────────────────────────────────────────
          const [movedCard] = srcSec.cards.splice(activeCardIndex, 1);
          if (overIsSectionContainer) {
            // Dropped onto the empty section area — append
            dstSec.cards.push(movedCard);
          } else {
            const overCardIndex = dstSec.cards.findIndex((c) => c.id === over.id);
            dstSec.cards.splice(overCardIndex, 0, movedCard);
          }
        }

        handleLayoutChange(next);
      }
    },
    [handleLayoutChange]
  );

  const handleAddComponent = useCallback(
    (newComponent, dashboardId, sectionId) => {
      handlers.handleAddComponent(newComponent, dashboardId ?? currentDashboardId, sectionId);
    },
    [handlers, currentDashboardId]
  );

  return {
    handleLayoutChange,
    handleDragEnd,
    handleAddComponent,
    handleSaveComponent: handlers.handleSaveComponent,
    handleDeleteComponent: handlers.handleDeleteComponent,
  };
};
