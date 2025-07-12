// src/components/AppLayoutParts/AddDashboardDialog.jsx
import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
} from '@mui/material';

export const AddDashboardDialog = ({
  isOpen,
  onClose,
  onAdd,
  title,
  setTitle,
}) => {
  const handleAdd = () => {
    onAdd();
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Додати новий дашборд</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Назва дашборду"
          type="text"
          fullWidth
          variant="standard"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Відмінити</Button>
        <Button onClick={handleAdd} disabled={!title.trim()}>
          Додати
        </Button>
      </DialogActions>
    </Dialog>
  );
};
