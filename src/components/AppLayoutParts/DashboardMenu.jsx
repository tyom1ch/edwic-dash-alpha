// src/components/AppLayoutParts/DashboardMenu.jsx
import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { DriveFileRenameOutline, DeleteOutline } from '@mui/icons-material';

export const DashboardMenu = ({
  anchorEl,
  onClose,
  onRename,
  onDelete,
  canDelete,
}) => {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <MenuItem onClick={onRename}>
        <ListItemIcon>
          <DriveFileRenameOutline fontSize="small" />
        </ListItemIcon>
        <ListItemText>Перейменувати</ListItemText>
      </MenuItem>
      <MenuItem onClick={onDelete} disabled={!canDelete}>
        <ListItemIcon>
          <DeleteOutline fontSize="small" />
        </ListItemIcon>
        <ListItemText>Видалити</ListItemText>
      </MenuItem>
    </Menu>
  );
};
