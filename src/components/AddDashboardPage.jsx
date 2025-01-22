import React, { useState } from "react";
import { TextField, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

const AddDashboardPage = ({ onAddDashboard, router }) => {
  const [title, setTitle] = useState("");
  const { navigate } = router; // Отримуємо navigate з пропсу router

  const [isAdd, setIsAdd] = useState(true);

  const handleSubmit = () => {
    if (title.trim()) {
      onAddDashboard(title); // Додаємо новий дашборд
      setIsAdd(false); // Закриваємо діалог
      navigate("/"); // Перехід на головну сторінку після додавання
    }
  };

  const handleClose = () => {
    setIsAdd(false); // Закриваємо діалог
    navigate("/"); // Перехід на головну сторінку
  };

  return (
    <Dialog open={isAdd} onClose={handleClose}>
      <DialogTitle>Додати новий дашборд</DialogTitle>
      <DialogContent>
        <TextField
          label="Назва дашборду"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Закрити</Button>
        <Button onClick={handleSubmit}>Додати</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDashboardPage;
