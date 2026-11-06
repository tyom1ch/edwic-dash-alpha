import React from "react";
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { DriveFileRenameOutline, DeleteOutline } from "@mui/icons-material";
import { useI18n } from "../../i18n/LanguageProvider";

export const DashboardMenu = ({
 anchorEl, onClose, onRename, onDelete, canDelete }) => {
  const { t } = useI18n();
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <MenuItem onClick={onRename}>
        <ListItemIcon>
          <DriveFileRenameOutline fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("Перейменувати")}</ListItemText>
      </MenuItem>
      <MenuItem onClick={onDelete} disabled={!canDelete}>
        <ListItemIcon>
          <DeleteOutline fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("Видалити")}</ListItemText>
      </MenuItem>
    </Menu>
  );
};
