// src/components/sections/SectionColumn.jsx
// dnd-kit SortableContext — drop indicator via useDroppable, no native HTML5 DnD
import React, { useState } from "react";
import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import WidgetWrapper from "../widgets/WidgetWrapper";
import { getWidgetById } from "../../core/widgetRegistry";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const GRID_COLS = 4;
const ROW_HEIGHT = 56;
const GAP = 8;

function getCardGridOptions(card) {
  if (card.grid_options) return card.grid_options;
  const def = getWidgetById(card.type)?.defaultGridOptions;
  return def || { columns: 1, rows: 1 };
}

// ─── DraggableSection header (useSortable on the whole section) ───────────────
function SectionDragHandle({ sectionId, lockMode, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionId,
    disabled: lockMode,
    data: { type: "section" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: 0,
        width: "100%",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {/* Pass drag handle attributes + listeners only to the grip icon */}
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { dragAttributes: attributes, dragListeners: listeners })
          : child
      )}
    </Box>
  );
}

// ─── SectionColumn ────────────────────────────────────────────────────────────
function SectionColumn({
  section,
  index,
  lockMode,
  onEditCard,
  onDeleteCard,
  onCardClick,
  onAddCard,
  onDelete,
  onRename,
  onResizeCard,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(section.title || "");

  // ── Droppable: highlight section when a card is dragged over it ──────────
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `section-droppable-${section.id}`,
    data: { type: "section-container", sectionId: section.id },
    disabled: lockMode,
  });

  const commitTitle = () => {
    setEditingTitle(false);
    const t = titleDraft.trim();
    if (t && t !== section.title) onRename(t);
    else setTitleDraft(section.title || "");
  };

  const cardIds = section.cards.map((c) => c.id);

  return (
    <SectionDragHandle sectionId={section.id} lockMode={lockMode}>
      <SectionInner
        section={section}
        index={index}
        lockMode={lockMode}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        titleDraft={titleDraft}
        setTitleDraft={setTitleDraft}
        commitTitle={commitTitle}
        cardIds={cardIds}
        isOver={isOver}
        setDroppableRef={setDroppableRef}
        onEditCard={onEditCard}
        onDeleteCard={onDeleteCard}
        onCardClick={onCardClick}
        onAddCard={onAddCard}
        onDelete={onDelete}
        onResizeCard={onResizeCard}
      />
    </SectionDragHandle>
  );
}

// Inner component receives dragAttributes + dragListeners from SectionDragHandle
function SectionInner({
  section,
  lockMode,
  editingTitle,
  setEditingTitle,
  titleDraft,
  setTitleDraft,
  commitTitle,
  cardIds,
  isOver,
  setDroppableRef,
  onEditCard,
  onDeleteCard,
  onCardClick,
  onAddCard,
  onDelete,
  onResizeCard,
  // injected by SectionDragHandle via cloneElement
  dragAttributes,
  dragListeners,
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, width: "100%" }}>

      {/* ── Section Header ──────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: "4px",
          minHeight: 28,
          userSelect: "none",
        }}
      >
        {/* Drag grip — only this element starts a section drag */}
        {!lockMode && (
          <Box
            {...dragAttributes}
            {...dragListeners}
            sx={{
              color: "rgba(255,255,255,0.35)",
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
              cursor: "grab",
              "&:active": { cursor: "grabbing" },
              touchAction: "none",
            }}
          >
            ⠿
          </Box>
        )}

        {editingTitle ? (
          <TextField
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setTitleDraft(section.title || ""); setEditingTitle(false); }
            }}
            autoFocus
            variant="standard"
            size="small"
            onMouseDown={(e) => e.stopPropagation()}
            inputProps={{ style: { fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" } }}
            sx={{ flex: 1, "& .MuiInput-underline:before": { borderColor: "rgba(255,255,255,0.2)" } }}
          />
        ) : (
          <Typography
            variant="overline"
            noWrap
            sx={{
              flex: 1, fontSize: "0.7rem", fontWeight: 500,
              color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em",
              lineHeight: "28px", cursor: !lockMode ? "text" : "default",
            }}
            onClick={(e) => {
              if (!lockMode) { e.stopPropagation(); setEditingTitle(true); setTitleDraft(section.title || ""); }
            }}
          >
            {section.title || "Секція"}
          </Typography>
        )}

        {!lockMode && !editingTitle && (
          <Tooltip title="Видалити секцію">
            <IconButton
              size="small"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              sx={{ color: "rgba(255,255,255,0.35)", p: "2px", "&:hover": { color: "error.light" } }}
            >
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* ── Card Grid ──────────────────────────────────────────────── */}
      <SortableContext items={cardIds} strategy={rectSortingStrategy}>
        <Box
          ref={setDroppableRef}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: `repeat(${GRID_COLS}, 1fr)` },
            gridAutoRows: `${ROW_HEIGHT}px`,
            gap: `${GAP}px`,
            p: "8px",
            borderRadius: "12px",
            // Highlight when a card is dragged over this section
            border: lockMode
              ? "none"
              : isOver
              ? "1.5px solid rgba(3,169,244,0.55)"
              : "1.5px dashed rgba(255,255,255,0.10)",
            backgroundColor: isOver
              ? "rgba(3,169,244,0.05)"
              : lockMode
              ? "transparent"
              : "rgba(255,255,255,0.015)",
            transition: "border-color 0.12s, background-color 0.12s",
            minHeight: `${ROW_HEIGHT * 2 + GAP * 3 + 16}px`,
            overflow: "visible",
          }}
        >
          {section.cards.map((card) => {
            const WidgetComp = getWidgetById(card.type)?.component;
            const go = getCardGridOptions(card);
            const cols = go.columns === "full" ? GRID_COLS : Math.min(go.columns ?? 1, GRID_COLS);
            const rows = go.rows === "auto" ? 1 : (go.rows ?? 1);

            return (
              <Box
                key={String(card.id)}
                sx={{
                  gridColumn: { xs: `span ${Math.min(cols, 2)}`, sm: `span ${cols}` },
                  gridRow: `span ${rows}`,
                  borderRadius: "12px",
                  boxSizing: "border-box",
                }}
              >
                <WidgetWrapper
                  component={card}
                  onEdit={() => onEditCard(card.id)}
                  onDelete={() => onDeleteCard(card.id)}
                  onResize={onResizeCard ? (id, dc, dr) => onResizeCard(section.id, id, dc, dr) : null}
                  lockMode={lockMode}
                  onClick={onCardClick}
                >
                  {WidgetComp ? (
                    <WidgetComp componentConfig={card} />
                  ) : (
                    <Box sx={{ p: 1, color: "text.disabled", fontSize: "0.75rem" }}>
                      Unknown: {card.type}
                    </Box>
                  )}
                </WidgetWrapper>
              </Box>
            );
          })}

          {/* ── Add card button (always last in grid) ─────────────── */}
          {!lockMode && (
            <Box
              sx={{
                gridColumn: "span 1",
                gridRow: "span 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px dashed rgba(3,169,244,0.4)",
                borderRadius: "12px",
                cursor: "pointer",
                minHeight: `${ROW_HEIGHT}px`,
                transition: "background-color 0.15s, border-color 0.15s",
                "&:hover": {
                  backgroundColor: "rgba(3,169,244,0.08)",
                  borderColor: "rgba(3,169,244,0.7)",
                },
              }}
              onClick={() => onAddCard(section.id)}
            >
              <Add sx={{ color: "rgba(3,169,244,0.7)", fontSize: 22 }} />
            </Box>
          )}
        </Box>
      </SortableContext>
    </Box>
  );
}

export default SectionColumn;
