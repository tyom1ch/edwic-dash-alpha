// src/components/DiscoveryDialog.jsx
import React, { useState, useEffect, useMemo } from "react";
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
  TextField,
} from "@mui/material";
import { ExpandLess, ExpandMore, AddCircleOutline } from "@mui/icons-material";
import MemoryIcon from "@mui/icons-material/Memory";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SensorsIcon from "@mui/icons-material/Sensors";
import ThermostatIcon from "@mui/icons-material/Thermostat";

import discoveryService from "../core/DiscoveryService";
import eventBus from "../core/EventBus";

// Допоміжний компонент для підсвічування тексту
const HighlightText = ({ text, highlight }) => {
  if (!highlight?.trim()) {
    return <span>{text}</span>;
  }

  const safeText = typeof text === "string" ? text : "";
  const parts = safeText.split(new RegExp(`(${highlight})`, "gi"));

  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Box
            component="mark"
            key={index}
            sx={{ bgcolor: "yellow", color: "black", p: 0, m: 0 }}
          >
            {part}
          </Box>
        ) : (
          part
        )
      )}
    </span>
  );
};

const getEntityIcon = (componentType) => {
  switch (componentType) {
    case "switch":
      return <PowerSettingsNewIcon />;
    case "sensor":
      return <SensorsIcon />;
    case "climate":
      return <ThermostatIcon />;
    default:
      return <AddCircleOutline />;
  }
};

const mapHaTypeToDashboardType = (entityConfig) => {
  console.log("Mapping HA type to dashboard type:", entityConfig);
  switch (entityConfig.componentType) {
    case "switch":
      return "switch";
    case "sensor":
      return "sensor";
    case "climate":
      if (entityConfig.temp_hi_cmd_t && entityConfig.temp_lo_cmd_t) {
        return "thermostat_range";
      }
      return "thermostat";
    default:
      return "sensor";
  }
};

function DiscoveryDialog({ isOpen, onClose, onAddEntity }) {
  const [discovered, setDiscovered] = useState([]);
  const [openDevices, setOpenDevices] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // Стан для пошукового запиту

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const initialDevices = discoveryService.getDiscoveredDevices();
      setDiscovered(initialDevices);
      setLoading(false);
      const handleUpdate = (devices) => setDiscovered([...devices]);
      eventBus.on("discovery:updated", handleUpdate);
      return () => {
        eventBus.off("discovery:updated", handleUpdate);
        setSearchQuery(""); // Очищуємо пошук при закритті
      };
    }
  }, [isOpen]);

  const handleToggleDevice = (deviceId) => {
    setOpenDevices((prev) => ({ ...prev, [deviceId]: !prev[deviceId] }));
  };

  const handleAddClick = (entity) => {
    const dashboardWidgetType = mapHaTypeToDashboardType(entity);
    const newComponent = {
      ...entity,
      type: dashboardWidgetType,
      label: entity.name,
    };
    onAddEntity(newComponent);
  };

  // Фільтруємо пристрої на основі пошукового запиту.
  // useMemo кешує результат, щоб уникнути перерахунку при кожному рендері.
  const filteredDiscovered = useMemo(() => {
    if (!searchQuery.trim()) {
      return discovered;
    }

    const lowerCaseQuery = searchQuery.toLowerCase().trim();

    // Використовуємо reduce для побудови нового масиву відфільтрованих пристроїв
    return discovered.reduce((acc, device) => {
      // Перевіряємо, чи збігається інформація про сам пристрій
      const isDeviceMatch =
        device.name.toLowerCase().includes(lowerCaseQuery) ||
        device.manufacturer.toLowerCase().includes(lowerCaseQuery) ||
        device.model.toLowerCase().includes(lowerCaseQuery);

      // Фільтруємо сутності цього пристрою, які відповідають запиту
      const matchingEntities = device.entities.filter((entity) => {
        const name = entity?.name;
        return (
          typeof name === "string" &&
          name.toLowerCase().includes(lowerCaseQuery)
        );
      });

      // Якщо пристрій сам збігається, ми показуємо його з усіма сутностями.
      // Якщо збігаються тільки сутності, показуємо пристрій тільки з цими сутностями.
      if (isDeviceMatch || matchingEntities.length > 0) {
        acc.push({
          ...device,
          entities: isDeviceMatch ? device.entities : matchingEntities,
        });
      }

      return acc;
    }, []);
  }, [discovered, searchQuery]);


  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Виявлені пристрої (Home Assistant MQTT)</DialogTitle>
      <DialogContent>
        {/* Поле для пошуку */}
        <Box sx={{ p: 1, mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Пошук пристроїв або сутностей"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {!loading && discovered.length === 0 && (
          <Typography sx={{ p: 4, textAlign: "center" }}>
            Пристроїв не знайдено.
          </Typography>
        )}
        {!loading &&
          filteredDiscovered.length === 0 &&
          discovered.length > 0 && (
            <Typography sx={{ p: 4, textAlign: "center" }}>
              Нічого не знайдено за вашим запитом.
            </Typography>
          )}

        <List>
          {/* Рендеримо відфільтрований список */}
          {filteredDiscovered.map((device) => {
            // При активному пошуку всі знайдені пристрої розгорнуті
            const isExpanded = !!searchQuery || !!openDevices[device.id];

            return (
              <React.Fragment key={device.id}>
                <ListItem button onClick={() => handleToggleDevice(device.id)}>
                  <ListItemIcon>
                    <MemoryIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <HighlightText
                        text={device.name}
                        highlight={searchQuery}
                      />
                    }
                    secondary={
                      <>
                        <HighlightText
                          text={device.manufacturer}
                          highlight={searchQuery}
                        />{" "}
                        -{" "}
                        <HighlightText
                          text={device.model}
                          highlight={searchQuery}
                        />{" "}
                        ({device.entities.length} сутностей)
                      </>
                    }
                  />
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {device.entities.map((entity) => (
                      <ListItem key={entity.id} sx={{ pl: 4 }}>
                        <ListItemIcon>
                          {getEntityIcon(entity.componentType)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <HighlightText
                              text={entity.name}
                              highlight={searchQuery}
                            />
                          }
                          secondary={`Тип: ${entity.componentType}`}
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
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрити</Button>
      </DialogActions>
    </Dialog>
  );
}

export default DiscoveryDialog;
