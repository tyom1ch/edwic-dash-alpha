// src/components/WidgetWrapper.jsx
import React from "react";
import { Paper, Box, IconButton, Typography, Tooltip } from "@mui/material";
import { Edit, Delete, DragIndicator } from "@mui/icons-material";

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
    <Paper
      elevation={3}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: onClick && lockMode ? "pointer" : "default",
      }}
      onClick={handleClick}
    >
      <Box
        className="widget-header"
        sx={{
          display: "flex",
          alignItems: "center",
          padding: "4px 8px",
          backgroundColor: lockMode ? "transparent" : "action.hover",
          cursor: lockMode ? "default" : "move",
        }}
      >
        {/* <DragIndicator sx={{ mr: 1, pointerEvents: 'none' }} /> */}
        {lockMode ? (
          <></>
        ) : (
          <DragIndicator sx={{ mr: 1, pointerEvents: "all" }} />
        )}

        <Typography
          variant="subtitle2"
          sx={{
            flexGrow: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {component.label || "Widget"}
        </Typography>

        {!lockMode && (
          <Box className="widget-no-drag">
            <Tooltip title="Редагувати">
              <IconButton size="small" onClick={handleEdit}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Видалити">
              <IconButton size="small" onClick={handleDelete}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Box
        className="widget-content"
        sx={{
          flexGrow: 1,
          padding: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "stretch",
          minHeight: 0,
          height: "100%",
          width: "100%",
          overflow: "hidden", // або 'auto', якщо треба скрол
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};

export default WidgetWrapper;
