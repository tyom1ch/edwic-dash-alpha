// src/components/DiscoveryDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, List,
  ListItem, ListItemText, ListItemIcon, IconButton, Collapse, Typography,
  Box, CircularProgress,
} from "@mui/material";
import { ExpandLess, ExpandMore, AddCircleOutline } from "@mui/icons-material";
import MemoryIcon from "@mui/icons-material/Memory";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SensorsIcon from "@mui/icons-material/Sensors";
import ThermostatIcon from '@mui/icons-material/Thermostat';

import discoveryService from "../core/DiscoveryService";
import eventBus from "../core/EventBus";

const getEntityIcon = (componentType) => {
  switch (componentType) {
    case "switch": return <PowerSettingsNewIcon />;
    case "sensor": return <SensorsIcon />;
    case "climate": return <ThermostatIcon />;
    default: return <AddCircleOutline />;
  }
};

// Функція для перетворення типу HA в тип вашого дашборду
const mapHaTypeToDashboardType = (entityConfig) => {
  console.log("Mapping HA type to dashboard type:", entityConfig);
  switch (entityConfig.componentType) {
    case "switch": return "switch";
    case "sensor": return "sensor";
    case "climate":
      // Якщо в конфігурації клімату є топіки для діапазону, це наш 'thermostat_range'
      if (entityConfig.temp_hi_cmd_t && entityConfig.temp_lo_cmd_t) {
        return "thermostat_range";
      }
      // В іншому випадку, це звичайний термостат
      return "thermostat";
    default: return "sensor";
  }
};

function DiscoveryDialog({ isOpen, onClose, onAddEntity }) {
  const [discovered, setDiscovered] = useState([]);
  const [openDevices, setOpenDevices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const initialDevices = discoveryService.getDiscoveredDevices();
      setDiscovered(initialDevices);
      setLoading(false);
      const handleUpdate = (devices) => setDiscovered([...devices]);
      eventBus.on("discovery:updated", handleUpdate);
      return () => eventBus.off("discovery:updated", handleUpdate);
    }
  }, [isOpen]);

  const handleToggleDevice = (deviceId) => {
    setOpenDevices((prev) => ({ ...prev, [deviceId]: !prev[deviceId] }));
  };

  const handleAddClick = (entity) => {
    // 1. Визначаємо тип віджета для нашого дашборду, передаючи всю конфігурацію.
    const dashboardWidgetType = mapHaTypeToDashboardType(entity);

    // 2. Створюємо новий об'єкт компонента.
    const newComponent = {
      ...entity,
      type: dashboardWidgetType,
      label: entity.name,
    };
    
    onAddEntity(newComponent);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Виявлені пристрої (Home Assistant MQTT)</DialogTitle>
      <DialogContent>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
        {!loading && discovered.length === 0 && <Typography sx={{ p: 4, textAlign: 'center' }}>Пристроїв не знайдено.</Typography>}
        <List>
          {discovered.map((device) => (
            <React.Fragment key={device.id}>
              <ListItem button onClick={() => handleToggleDevice(device.id)}>
                <ListItemIcon><MemoryIcon /></ListItemIcon>
                <ListItemText primary={device.name} secondary={`${device.manufacturer} - ${device.model} (${device.entities.length} сутностей)`} />
                {openDevices[device.id] ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={openDevices[device.id]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {device.entities.map((entity) => (
                    <ListItem key={entity.id} sx={{ pl: 4 }}>
                      <ListItemIcon>{getEntityIcon(entity.componentType)}</ListItemIcon>
                      <ListItemText primary={entity.name} secondary={`Тип: ${entity.componentType}`} />
                      <IconButton edge="end" aria-label="add" onClick={() => handleAddClick(entity)}><AddCircleOutline color="primary" /></IconButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Закрити</Button></DialogActions>
    </Dialog>
  );
}

export default DiscoveryDialog;