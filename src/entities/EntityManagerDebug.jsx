import React, { useEffect, useState } from "react";
import {
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EntityManager from "./EntityManager";

const EntityManagerDebug = ({ onAddComponent }) => {
  const [entities, setEntities] = useState([]);

  useEffect(() => {
    const fetchEntities = () => {
      setEntities([...EntityManager.getEntities()]); // Оновлюємо стан із поточного списку сутностей
    };

    // Ініціалізуємо сутності
    EntityManager.initializeEntities("");

    // Підписуємось на зміни
    EntityManager.subscribeToAllEntities(fetchEntities);

    // Оновлюємо стан при першому рендері
    fetchEntities();

    // Відписка при демонтажі компонента
    return () => {
      EntityManager.unsubscribeFromAllEntities(fetchEntities);
    };
  }, []); // Залежність `[]`, щоб підписка виконувалась лише один раз

  // Групування сутностей за префіксом (наприклад, "kotelnya-thermostat")
  const groupedEntities = entities.reduce((groups, entity) => {
    const groupKey = entity.label.split("/")[0]; // Використовуємо першу частину теми
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(entity);
    return groups;
  }, {});

  const handleAddEntity = (entity) => {
    onAddComponent({
      type: entity.type,
      label: entity.label,
      stateTopic: entity.stateTopic,
      commandTopic: entity.commandTopic,
      id: Date.now(),
    });
  };

  return (
    <Box sx={{ width: { xs: "1", sm: "auto", md: "auto" } }} marginTop={1}>
      <Typography variant="h5" gutterBottom>
        Мої пристрої
      </Typography>
      {Object.keys(groupedEntities).length === 0 ? (
        <Typography>Сутності не знайдено</Typography>
      ) : (
        <Box>
          {Object.entries(groupedEntities).map(([group, items]) => (
            <Accordion key={group}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{group}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {items.map((entity) => (
                    <ListItem key={entity.id} divider>
                      <ListItemText
                        primary={entity.label.split("/").slice(1).join("/")} // Підпорядкована частина
                        secondary={`Стан: ${entity.state ?? "Невідомо"}`}
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleAddEntity(entity)}
                        >
                          Додати
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default EntityManagerDebug;
