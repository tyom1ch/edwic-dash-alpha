import React from "react";
import { useI18n } from "../../i18n/LanguageProvider";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

export const AddDashboardDialog = ({
 isOpen, onClose, onAdd, title, setTitle }) => {
  const { t } = useI18n();
  const handleAdd = () => {
    onAdd();
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("Додати новий дашборд")}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={t("Назва дашборду")}
          type="text"
          fullWidth
          variant="standard"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Відмінити")}</Button>
        <Button onClick={handleAdd} disabled={!title.trim()}>
          {t("Додати")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
