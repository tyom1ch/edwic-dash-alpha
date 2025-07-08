// src/components/widgets/WidgetWrapper.jsx
import React from "react";
import {
  Paper,
  Box,
  IconButton,
  Typography,
  Tooltip,
  Chip,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

const WidgetWrapper = ({
  children,
  component,
  onEdit,
  onDelete,
  lockMode,
  onClick,
}) => {
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(component.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Ви впевнені, що хочете видалити віджет "${component.label || component.id}"?`
      )
    ) {
      onDelete(component.id);
    }
  };

  const handleClick = (e) => {
    if (onClick && lockMode && !e.target.closest(".widget-no-drag")) {
      onClick(component);
    }
  };

  return (
    <Box
      elevation={3}
      sx={{
        position: "relative", // Важливо для позиціонування елементів керування
        height: "100%",
        padding: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: lockMode
          ? onClick
            ? "pointer"
            : "default" // Курсор для режиму перегляду
          : "move", // Курсор "переміщення" для режиму редагування
      }}
      onClick={handleClick}
    >
      {children}

      {/* --- ЕЛЕМЕНТИ КЕРУВАННЯ, ЩО З'ЯВЛЯЮТЬСЯ ПОВЕРХ --- */}
      {/* Вони рендеряться тільки в режимі редагування (!lockMode) */}
      {!lockMode && (
        // Цей контейнер не перехоплює кліки, дозволяючи їм "проходити" крізь себе,
        // окрім тих місць, де знаходяться його дочірні елементи.
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            p: 1,
            pointerEvents: "none", // Дуже важливо!
          }}
        >
          {/* Кнопки керування */}
          <Box
            className="widget-no-drag" // Цей клас запобігає перетягуванню
            sx={{
              position: "absolute",
              top: "8px",
              right: "8px",
              pointerEvents: "auto", // Робимо елементи знову клікабельними
              display: "flex",
              gap: "4px",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              borderRadius: "18px",
              p: "2px",
            }}
          >
            <Tooltip title="Редагувати">
              <IconButton
                size="small"
                onClick={handleEdit}
                sx={{ color: "white" }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Видалити">
              <IconButton
                size="small"
                onClick={handleDelete}
                sx={{ color: "white" }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default WidgetWrapper;
