import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Collapse,
  MenuItem,
  Select,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import EntityManagerDebug from "../entities/EntityManagerDebug";

function ComponentDialog({
  isOpen,
  onClose,
  onSave,
  onAdd,
  component,
  isEdit,
}) {
  const [localComponent, setLocalComponent] = useState(component || {});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (isEdit && component) {
      setLocalComponent(component);
      console.log(component);
    } else if (!isEdit) {
      setLocalComponent({}); // Clear fields for "Add Component"
    }
  }, [isEdit, component]);

  const handleSave = () => {
    const title = localComponent.label?.split("/").slice(-1)[0] || ""; // Значення за замовчуванням
    // Якщо поле пусте, автоматично заповнити його
    if (!localComponent.label || localComponent.label.trim() === "") {
      setLocalComponent((prev) => ({
        ...prev,
        label: title, // Присвоєння значення за замовчуванням
      }));
    }

    if (isEdit && onSave && localComponent) {
      onSave(localComponent); // Зберегти зміни для існуючого компонента
    } else if (!isEdit && onAdd && localComponent) {
      onAdd(localComponent); // Додати новий компонент
    }

    onClose(); // Закрити діалог
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalComponent((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleAdvanced = () => {
    setAdvancedOpen((prev) => !prev);
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{isEdit ? "Редагувати" : "Додати"}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Назва картки"
          placeholder="Введіть назву картки"
          type="text"
          fullWidth
          name="label"
          // value={localComponent.label?.split("/").slice(-1) || ""}
          onChange={handleChange}
          sx={{ mb: 2 }}
        />
        {localComponent.type === "sensor" ? (
          <Select
            fullWidth
            name="unit"
            value={localComponent.unit || ""}
            onChange={handleChange}
            displayEmpty
            sx={{ mb: 2 }}
          >
            <MenuItem value="">
              Виберіть символ
            </MenuItem>
            <MenuItem value="°C">°C (градуси Цельсія)</MenuItem>
            <MenuItem value="%">% (відсотки)</MenuItem>
            <MenuItem value="m">m (метри)</MenuItem>
            <MenuItem value="kg">kg (кілограми)</MenuItem>
            <MenuItem value="W">W (вати)</MenuItem>
            <MenuItem value="kWh">kWh (кіловат-години)</MenuItem>
            <MenuItem value="Pa">Pa (паскалі)</MenuItem>
            <MenuItem value="ppm">ppm (частки на мільйон)</MenuItem>
            <MenuItem value="V">V (вольти)</MenuItem>
          </Select>
        ) : (
          false
        )}
        <Select
          fullWidth
          value={localComponent.type || ""}
          displayEmpty
          name="type"
          onChange={(e) => handleChange(e)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="">Виберіть тип</MenuItem>

          <MenuItem value="sensor">Сенсор</MenuItem>
          <MenuItem value="switch">Перемикач</MenuItem>
          <MenuItem value="input">Введення</MenuItem>
          <MenuItem value="input">Слайдер</MenuItem>
          <MenuItem value="climate">Термостат</MenuItem>
          {/* Додаємо новий тип для InputBox */}
        </Select>

        <EntityManagerDebug
          onAddComponent={(component) => setLocalComponent(component)}
        />

        <Button
          sx={{ mb: 2 }}
          fullWidth
          onClick={toggleAdvanced}
          endIcon={advancedOpen ? <ExpandLess /> : <ExpandMore />}
        >
          Просунуте налаштування
        </Button>
        <Collapse in={advancedOpen}>
          {/* <TextField
            margin="dense"
            label="Type"
            placeholder="Enter type (e.g., sensor, switch)"
            type="text"
            fullWidth
            name="type"
            value={localComponent.type || ""}
            onChange={handleChange}
          /> */}

          <TextField
            margin="dense"
            label="State Topic"
            placeholder="Введіть state topic (e.g., home/sensor/state)"
            type="text"
            fullWidth
            name="stateTopic"
            value={localComponent.stateTopic || ""}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            label="Command Topic"
            placeholder="Введіть command topic (e.g., home/sensor/command)"
            type="text"
            fullWidth
            name="commandTopic"
            value={localComponent.commandTopic || ""}
            onChange={handleChange}
          />
        </Collapse>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Відмінити
        </Button>
        <Button onClick={handleSave} color="primary">
          {isEdit ? "Зберегти" : "Додати"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ComponentDialog;
