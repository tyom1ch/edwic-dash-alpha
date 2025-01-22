import React from 'react';
import { Modal, Box, TextField, Select, MenuItem, Typography, Button } from '@mui/material';

const ComponentDialog = ({ isOpen, onClose, onSave, component, isEdit }) => {
  const [formData, setFormData] = React.useState(component || {
    type: 'sensor',
    label: '',
    stateTopic: '',
    commandTopic: '',
    measureUnit: '',
  });

  React.useEffect(() => {
    setFormData(component || { type: 'sensor', label: '', stateTopic: '', commandTopic: '' });
  }, [component]);

  const modifyTopic = (topic) => {
    console.log("MOD:", topic);
    return topic.split("/").slice(0, -1).concat("command").join("/");
  };

  const handleInputChange = (field, value) => {
    const updatedFormData = { ...formData, [field]: value };

    if (value === "switch" || "input") {
      updatedFormData.commandTopic = modifyTopic(formData.stateTopic);
    } else if (value === "sensor") {
      updatedFormData.commandTopic = "";
    }
  
    setFormData(updatedFormData);
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography variant="h6" gutterBottom>
          {isEdit ? 'Редагувати компонент' : 'Додати новий компонент'}
        </Typography>
        <TextField
          label="Мітка"
          fullWidth
          margin="normal"
          value={formData.label}
          onChange={(e) => handleInputChange('label', e.target.value)}
        />
        <Select
          fullWidth
          value={formData.type}
          onChange={(e) => handleInputChange('type', e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="sensor">Сенсор</MenuItem>
          <MenuItem value="switch">Перемикач</MenuItem>
          <MenuItem value="input">Введення</MenuItem> {/* Додаємо новий тип для InputBox */}
        </Select>
        <TextField
          label="Топік стану"
          fullWidth
          margin="normal"
          value={formData.stateTopic}
          onChange={(e) => handleInputChange('stateTopic', e.target.value)}
        />
        {formData.type === 'sensor' && (
        <TextField
        label="Символ вимірювання"
        fullWidth
        margin="normal"
        value={formData.measureUnit}
        onChange={(e) => handleInputChange('measureUnit', e.target.value)}
        />
        )}
        {formData.type === 'switch' && (
          <TextField
            label="Топік команди"
            fullWidth
            margin="normal"
            value={formData.commandTopic}
            onChange={(e) => handleInputChange('commandTopic', e.target.value)}
          />
        )}
        {formData.type === 'input' && ( // Додаємо InputBox, якщо вибрано тип "input"
          <TextField
          label="Топік команди"
          fullWidth
          margin="normal"
          value={formData.commandTopic}
          onChange={(e) => handleInputChange('commandTopic', e.target.value)}
          />
        )}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleSave}
        >
          {isEdit ? 'Зберегти' : 'Додати'}
        </Button>
      </Box>
    </Modal>
  );
};

export default ComponentDialog;