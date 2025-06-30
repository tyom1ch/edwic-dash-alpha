// src/components/DiscoveryDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Collapse,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { ExpandLess, ExpandMore, AddCircleOutline } from "@mui/icons-material";
import MemoryIcon from "@mui/icons-material/Memory"; // Іконка для пристрою
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew"; // Іконка для перемикача
import SensorsIcon from "@mui/icons-material/Sensors"; // Іконка для сенсора

import discoveryService from "../core/DiscoveryService";
import eventBus from "../core/EventBus";

// Функція для вибору іконки на основі типу сутності
const getEntityIcon = (componentType) => {
  switch (componentType) {
    case "switch":
      return <PowerSettingsNewIcon />;
    case "sensor":
      return <SensorsIcon />;
    default:
      return <AddCircleOutline />;
  }
};

// Функція для перетворення типу HA в тип вашого дашборду
const mapHaTypeToDashboardType = (haType) => {
  switch (haType) {
    case "switch": return "switch";
    case "sensor": return "sensor";
    case "fan": return "fan";
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

      const handleUpdate = (devices) => {
        setDiscovered([...devices]); // Використовуємо спред для оновлення
      };
      eventBus.on("discovery:updated", handleUpdate);

      return () => {
        eventBus.off("discovery:updated", handleUpdate);
      };
    }
  }, [isOpen]);

  const handleToggleDevice = (deviceId) => {
    setOpenDevices((prev) => ({ ...prev, [deviceId]: !prev[deviceId] }));
  };

  const handleAddClick = (entity) => {
    const newComponent = {
      label: entity.name,
      type: mapHaTypeToDashboardType(entity.componentType),
      brokerId: entity.brokerId,
      state_topic: entity.state_topic,
      command_topic: entity.command_topic,
      unit_of_measurement: entity.unit_of_measurement,
      payload_on: entity.payload_on,
      payload_off: entity.payload_off,
    };
    onAddEntity(newComponent);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Виявлені пристрої (Home Assistant MQTT)</DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && discovered.length === 0 && (
          <Typography sx={{ p: 4, textAlign: "center" }}>
            Пристроїв не знайдено. Переконайтесь, що на ваших пристроях
            увімкнено Discovery і вони підключені до брокера з правильним топіком.
          </Typography>
        )}

        <List>
          {discovered.map((device) => (
            <React.Fragment key={device.id}>
              <ListItem button onClick={() => handleToggleDevice(device.id)}>
                <ListItemIcon>
                  <MemoryIcon />
                </ListItemIcon>
                <ListItemText
                  primary={device.name}
                  secondary={`${device.manufacturer} - ${device.model} (${device.entities.length} сутностей)`}
                />
                {openDevices[device.id] ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse
                in={openDevices[device.id]}
                timeout="auto"
                unmountOnExit
              >
                <List component="div" disablePadding>
                  {device.entities.map((entity) => (
                    <ListItem key={entity.id} sx={{ pl: 4 }}>
                      <ListItemIcon>
                        {getEntityIcon(entity.componentType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={entity.name}
                        secondary={`Topic: ${entity.state_topic || entity.command_topic}`}
                      />
                      <IconButton
                        edge="end"
                        aria-label="add"
                        onClick={() => handleAddClick(entity)}
                      >
                        <AddCircleOutline color="primary" />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрити</Button>
      </DialogActions>
    </Dialog>
  );
}

export default DiscoveryDialog;