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

export const RenameDashboardDialog = ({
  isOpen,
  onClose,
  onRename,
  renameInfo,
  setRenameInfo,
}) => {
  const { t } = useI18n();
  const handleRename = () => {
    onRename();
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("Перейменувати дашборд")}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={t("Нова назва")}
          type="text"
          fullWidth
          variant="standard"
          value={renameInfo.name}
          onChange={(e) => setRenameInfo((p) => ({ ...p, name: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Відмінити")}</Button>
        <Button onClick={handleRename} disabled={!renameInfo.name.trim()}>
          {t("Зберегти")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
