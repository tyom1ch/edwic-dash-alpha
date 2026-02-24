import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

export const RenameDashboardDialog = ({
  isOpen,
  onClose,
  onRename,
  renameInfo,
  setRenameInfo,
}) => {
  const handleRename = () => {
    onRename();
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Перейменувати дашборд</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Нова назва"
          type="text"
          fullWidth
          variant="standard"
          value={renameInfo.name}
          onChange={(e) => setRenameInfo((p) => ({ ...p, name: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Відмінити</Button>
        <Button onClick={handleRename} disabled={!renameInfo.name.trim()}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
};
