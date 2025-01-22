import React, { useState } from "react";
import { TextField, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import useSimpleRouter from "../hooks/useSimpleRouter"; // Використовуємо ваш хук роутера

const AddDashboardPage = ({ onAddDashboard }) => {
  const [title, setTitle] = useState("");
  const { navigate } = useSimpleRouter(); // Хук для навігації
  const [isAdd, setIsAdd] = useState(true);

  const handleSubmit = () => {
    if (title.trim()) {
      onAddDashboard(title); // Додаємо новий дашборд
      setIsAdd(false);
      navigate("/"); // Перехід на головну сторінку після додавання
    }
  };

  return (
    <Dialog open={isAdd} onClose={() => navigate("/")}>
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
        <Button onClick={() => {navigate("/"); setIsAdd(false);}}>Закрити</Button>
        <Button onClick={handleSubmit}>Додати</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDashboardPage;
