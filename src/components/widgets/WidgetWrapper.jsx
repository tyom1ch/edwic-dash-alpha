// src/components/widgets/WidgetWrapper.jsx
import React, { useState } from "react";
import { Box, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button } from "@mui/material";
import { Edit, Delete, WarningAmber, OpenWith } from "@mui/icons-material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getRequiredFields } from "../../core/widgetRegistry";

const WidgetWrapper = ({
  children,
  component,
  onEdit,
  onDelete,
  onResize,
  lockMode,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: component.id,
    disabled: lockMode,
    data: { type: "card" },
  });

  // Local state for resize preview
  const [resizePreview, setResizePreview] = useState(null); // { deltaColumns, deltaRows }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(component.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = (e) => {
    e?.stopPropagation();
    setIsDeleteDialogOpen(false);
    onDelete?.(component.id);
  };

  const cancelDelete = (e) => {
    e?.stopPropagation();
    setIsDeleteDialogOpen(false);
  };

  const handleClick = () => {
    if (onClick && lockMode) onClick(component);
  };

  const requiredFields = getRequiredFields(component.type, component.variant);
  const isIncomplete = requiredFields.some((field) =>
    field.keys.every((key) => {
      if (key === "unit_of_meas") return false;
      const val = component[key];
      return val === undefined || val === null || val.toString().trim() === "";
    })
  );

  // Constants for computing grid resize preview
  const ROW_HEIGHT = 56;
  const GAP = 8;
  const GRID_COLS = 4;
  
  // Get current dimensions for the preview box calculation
  const go = component.grid_options || { columns: 1, rows: 1 };
  const curCols = go.columns === "full" ? GRID_COLS : Math.min(go.columns ?? 1, GRID_COLS);
  const curRows = go.rows === "auto" ? 1 : (go.rows ?? 1);

  return (
    <Box
      ref={setNodeRef}
      style={style}
      className="widget-card"
      data-card-id={component.id}
      {...attributes}
      {...(!lockMode ? listeners : {})}
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: lockMode ? (onClick ? "pointer" : "default") : "grab",
        borderRadius: "12px",
        boxSizing: "border-box",
        bgcolor: "rgba(255,255,255,0.04)",
        border: lockMode ? "none" : "1px solid rgba(255,255,255,0.08)",
        // Origin placeholder styling during drag
        opacity: isDragging ? 0.2 : 1,
        zIndex: isDragging ? 0 : "auto",
        "&:active": { cursor: !lockMode ? "grabbing" : undefined },
        "& .widget-controls": {
          opacity: 0,
          transition: "opacity 0.15s",
        },
        "&:hover .widget-controls": {
          opacity: 1,
        },
      }}
      onClick={handleClick}
    >
      {/* ── Тултіп ──────── */}
      {!lockMode && isIncomplete && (
        <Tooltip title="Неповна конфігурація" placement="top">
          <Box
            sx={{
              position: "absolute",
              top: 6,
              left: 6,
              zIndex: 15,
              color: "warning.main",
              cursor: "help",
            }}
          >
            <WarningAmber sx={{ fontSize: 16 }} />
          </Box>
        </Tooltip>
      )}

      {/* ── The actual content is wrapped to ensure overflow hidden applies locally, 
            while the preview overlay can exceed bounds ──────── */}
      <Box sx={{ 
        flex: 1, 
        overflow: "hidden", 
        display: "flex", 
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        containerType: "size" 
      }}>
        {children}
      </Box>

      {/* ── Кнопки ────── */}
      {!lockMode && (
        <Box
          className="widget-controls no-drag"
          data-no-drag="true"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 30,
            display: "flex",
            gap: "2px",
            bgcolor: "rgba(0,0,0,0.75)",
            borderRadius: "10px",
            p: "2px",
          }}
        >
          <Tooltip title="Редагувати">
            <IconButton size="small" onClick={handleEdit} sx={{ color: "rgba(255,255,255,0.8)", p: "3px" }}>
              <Edit sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Видалити">
            <IconButton size="small" onClick={handleDelete} sx={{ color: "rgba(255,255,255,0.8)", p: "3px" }}>
              <Delete sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* ── Visual Resize Preview Overlay ───── */}
      {!lockMode && resizePreview && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            // Calculate pixel dimensions for the preview frame based on the base card and deltas
            // The card's current width is 100% of its slot. To draw the extended size, we calculate:
            // width = 100% + (deltaCols * cellWidth) + (deltaCols * gap)
            // But doing it via calc on parent's 100% is tricky, it's safer to base it on CSS percentages relative
            // to the outer grid or by just projecting the absolute pixel offsets.
            // Wait, we can't easily position purely with 100% if we want to spill out to the right/bottom accurately
            // without knowing exactly parent width.
            // Better to use CSS calc: newWidth = (curCols+deltaCols)/curCols * 100% 
            // taking gaps into account: (100% + GAP) * (newCols/curCols) - GAP
            width: `calc((100% + ${GAP}px) * ${(curCols + resizePreview.deltaColumns) / curCols} - ${GAP}px)`,
            height: `calc((100% + ${GAP}px) * ${(curRows + resizePreview.deltaRows) / curRows} - ${GAP}px)`,
            zIndex: 100,
            pointerEvents: "none",
            borderRadius: "12px",
            border: "2px dashed rgba(3,169,244,0.8)",
            bgcolor: "rgba(3,169,244,0.15)",
            transition: "width 0.1s, height 0.1s",
          }}
        />
      )}

      {/* ── Ресайз ───── */}
      {!lockMode && onResize && (
        <Box
          className="widget-controls no-drag"
          data-no-drag="true"
          title="Змінити розмір"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const el = e.currentTarget;
            el.setPointerCapture(e.pointerId);
            document.body.style.cursor = "nwse-resize";

            const startX = e.clientX;
            const startY = e.clientY;
            
            const cardEl = el.closest(".widget-card");
            // Find accurate cell sizes
            const cellW = cardEl ? (cardEl.offsetWidth + GAP) / curCols : 80;
            const cellH = ROW_HEIGHT + GAP; 

            let currentDeltaCols = 0;
            let currentDeltaRows = 0;

            const onMove = (ev) => {
              // Calculate potential deltas
              const rawDeltaX = ev.clientX - startX;
              const rawDeltaY = ev.clientY - startY;

              let deltaCols = Math.round(rawDeltaX / cellW);
              let deltaRows = Math.round(rawDeltaY / cellH);

              // Clamp constraints
              const maxCols = GRID_COLS - curCols;
              const minCols = 1 - curCols;
              const minRows = 1 - curRows;
              
              deltaCols = Math.max(minCols, Math.min(deltaCols, maxCols));
              deltaRows = Math.max(minRows, deltaRows);

              if (deltaCols !== currentDeltaCols || deltaRows !== currentDeltaRows) {
                currentDeltaCols = deltaCols;
                currentDeltaRows = deltaRows;
                setResizePreview({ deltaColumns: deltaCols, deltaRows: deltaRows });
              }
            };

            const onUp = (ev) => {
              el.releasePointerCapture(ev.pointerId);
              document.body.style.cursor = "";
              el.removeEventListener("pointermove", onMove);
              el.removeEventListener("pointerup", onUp);
              
              if (currentDeltaCols !== 0 || currentDeltaRows !== 0) {
                onResize(component.id, currentDeltaCols, currentDeltaRows);
              }
              setResizePreview(null);
            };

            el.addEventListener("pointermove", onMove);
            el.addEventListener("pointerup", onUp);
          }}
          sx={{
            position: "absolute",
            bottom: { xs: 0, sm: 3 },
            right: { xs: 0, sm: 3 },
            zIndex: 110,
            width: { xs: 48, sm: 24 },
            height: { xs: 48, sm: 24 },
            cursor: "nwse-resize",
            color: "rgba(255,255,255,0.35)",
            display: "flex",
            alignItems: { xs: "flex-end", sm: "center" },
            justifyContent: { xs: "flex-end", sm: "center" },
            p: { xs: "8px", sm: 0 },
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
            "&:hover": { color: "rgba(3,169,244,0.8)" },
          }}
        >
          <OpenWith sx={{ fontSize: 12 }} />
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={cancelDelete} maxWidth="xs" fullWidth onClick={(e) => e.stopPropagation()}>
        <DialogTitle>Видалити віджет?</DialogTitle>
        <DialogContent dividers>
          <Typography>Дійсно видалити "{component.label || component.id}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="inherit">Скасувати</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">Видалити</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WidgetWrapper;