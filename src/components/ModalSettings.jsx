import React from 'react';
import { Modal, Box, TextField, Button } from '@mui/material';

const ModalSettings = ({ open, onClose, connectionSettings, setConnectionSettings, onSave }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          padding: 4,
          borderRadius: 2,
          boxShadow: 24,
          width: 300,
        }}
      >
        <h2>Налаштування підключення</h2>
        <TextField
          label="IP адреса"
          variant="outlined"
          fullWidth
          margin="normal"
          value={connectionSettings.host}
          onChange={(e) => setConnectionSettings({ ...connectionSettings, host: e.target.value })}
        />
        <TextField
          label="Логін"
          variant="outlined"
          fullWidth
          margin="normal"
          value={connectionSettings.username}
          onChange={(e) => setConnectionSettings({ ...connectionSettings, username: e.target.value })}
        />
        <TextField
          label="Пароль"
          variant="outlined"
          type="password"
          fullWidth
          margin="normal"
          value={connectionSettings.password}
          onChange={(e) => setConnectionSettings({ ...connectionSettings, password: e.target.value })}
        />
        <Button onClick={onSave} variant="contained" fullWidth sx={{ marginTop: 2 }}>
          Зберегти
        </Button>
      </Box>
    </Modal>
  );
};

export default ModalSettings;
