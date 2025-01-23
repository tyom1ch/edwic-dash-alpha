import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  MenuItem,
  Select,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EntityManager from "./EntityManager";

const EntityManagerDebug = ({ onAddComponent }) => {
  const [entities, setEntities] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null); // Для збереження вибраної сутності

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
    setIsAccordionOpen(false); // Згортання акордеону
    setSelectedEntity(null); // Скидання вибору сутності
  };

  const handleEntitySelection = (entity) => {
    handleAddEntity(entity);
    setSelectedEntity(entity); // Встановлюємо вибрану сутність
    setIsAccordionOpen(false); // Відкриваємо акордеон
  };

  return (
    <Box
      sx={{ width: { xs: "1", sm: "auto", md: "auto" }, mb: 2 }}
      marginTop={1}
    >
      <Typography variant="h5" gutterBottom>
        Мої пристрої
      </Typography>
      {Object.keys(groupedEntities).length === 0 ? (
        <Typography>Сутності не знайдено</Typography>
      ) : (
        <Box>
          <Select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            displayEmpty
            fullWidth
          >
            <MenuItem value="">
              Виберіть групу
            </MenuItem>
            {Object.keys(groupedEntities).map((group) => (
              <MenuItem key={group} value={group}>
                {group}
              </MenuItem>
            ))}
          </Select>

          {selectedGroup && (
            <Accordion expanded={isAccordionOpen}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              >
                <Typography>
                  {" "}
                  {selectedEntity
                    ? selectedEntity.label.split("/").slice(1).join("/")
                    : "Виберіть сутність"}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {groupedEntities[selectedGroup].map((entity) => (
                  <Box key={entity.id} sx={{ mb: 1 }}>
                    <Typography>
                      {entity.label.split("/").slice(1).join("/")}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Стан: {entity.state ?? "Невідомо"}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleEntitySelection(entity)}
                      sx={{ mt: 1 }}
                    >
                      Застосувати
                    </Button>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}
    </Box>
  );
};

export default EntityManagerDebug;
