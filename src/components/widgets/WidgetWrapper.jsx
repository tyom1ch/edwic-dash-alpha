import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Edit, Delete, WarningAmber, DragIndicator } from "@mui/icons-material";
import { getRequiredFields } from "../../core/widgetRegistry";
// Видалено useSortable та CSS, бо ми використовуємо hello-pangea/dnd

const WidgetWrapper = ({
  children,
  component,
  onEdit,
  onDelete,
  lockMode,
  onClick,
  provided,
  isDragging,
}) => {
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(component.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Ви впевнені, що хочете видалити віджет "${
          component.label || component.id
        }"?`
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

  // --- ОНОВЛЕНА ЛОГІКА ПЕРЕВІРКИ ---
  // Отримуємо повні дані про обов'язкові поля, передаючи варіант для віджетів (напр. клімату)
  const requiredFields = getRequiredFields(component.type, component.variant);

  // Перевіряємо, чи якесь з обов'язкових полів не заповнене.
  // Поле вважається незаповненим, якщо ЖОДЕН з його можливих ключів (`keys`) не має значення.
  const isIncomplete = requiredFields.some((field) => {
    const hasValue = field.keys.some((key) => {
      const val = component[key];
      
      if (key === "unit_of_meas") {
        return true;
      }
      return val !== undefined && val !== null && val.toString().trim() !== "";
    });
    return !hasValue; // Поле неповне, якщо не знайдено жодного ключа зі значенням
  });

  // --- DND-KIT ПІДКЛЮЧЕННЯ (ВИДАЛЕНО) ---

  const style = {
    // В hello-pangea інлайн стилі та трансформації приходять через provided.draggableProps.style
    ...provided?.draggableProps?.style,
    
    // Розрахунок розміру сітки: 
    // За замовчуванням w: 2, h: 2 (в старій системі 12 колонок).
    // Тепер це просто кількість ячейок CSS Grid
    gridColumn: `span ${Math.max(1, Math.floor((component.layout?.w || 2) / 2))}`,
    gridRow: `span ${Math.max(1, Math.floor((component.layout?.h || 2) / 2))}`,
  };

  return (
    <Box
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      style={style}
      elevation={3}
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: lockMode ? (onClick ? "pointer" : "default") : "default",
        // Додаємо рамку для виділення в режимі редагування
        borderRadius: "4px",
        boxSizing: "border-box",
        boxShadow: lockMode ? 1 : 4, // Трохи піднімемо в режимі редагування
      }}
      onClick={handleClick}
    >
      {/* --- ОНОВЛЕНИЙ ІНДИКАТОР НЕПОВНОЇ КОНФІГУРАЦІЇ --- */}
      {/* Показуємо його тільки в режимі редагування (!lockMode) */}
      {!lockMode && isIncomplete && (
        <Tooltip title="Неповна конфігурація. Заповніть обов'язкові поля в налаштуваннях.">
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 10,
              color: "warning.main",
            }}
          >
            <WarningAmber />
          </Box>
        </Tooltip>
      )}

      {children}

      {/* --- ЕЛЕМЕНТИ КЕРУВАННЯ --- */}
      {!lockMode && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.2)", // Затемнення, щоб показати режим редагування
            zIndex: 20, // Поверх контенту
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* DRAG HANDLE (По центру віджета) */}
          {/* Передаємо dragHandleProps ВИКЛЮЧНО сюди */}
          <Box
            {...provided?.dragHandleProps}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              borderRadius: "50%",
              width: 48,
              height: 48,
              cursor: "move",
              pointerEvents: "auto", // Дозволяємо захоплювати
              color: "white",
              boxShadow: 3,
            }}
          >
            <DragIndicator fontSize="large" />
          </Box>

          {/* Кнопки Редагування / Видалення */}
          <Box
            sx={{
              position: "absolute",
              top: "8px",
              right: "8px",
              pointerEvents: "auto",
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
