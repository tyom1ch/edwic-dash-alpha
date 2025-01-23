import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useColorScheme,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import LockIcon from '@mui/icons-material/Lock';

function ModalDashSettings({ anchorEl, open, onClose, lockMode, setLockMode }) {
    const { mode, setMode } = useColorScheme(); // Отримуємо режим і метод для зміни
  
    const handleThemeChange = () => {
      setMode(mode === "light" ? "dark" : "light"); // Перемикаємо тему
    };
  
    const handleLockMode = () => {
      setLockMode(!lockMode); // Перемикаємо lockMode
    };
  
    return (
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem onClick={handleThemeChange}>
          <ListItemIcon>
            <Brightness4Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Toggle Theme</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLockMode}>
          <ListItemIcon>
            <LockIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{lockMode ? "Lock edit" : "Unlock edit"}</ListItemText>
        </MenuItem>
      </Menu>
    );
  }

export default ModalDashSettings;
