import React, { useState, useEffect } from 'react';
import { Typography, Box } from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import MQTTCore from '../core/MQTTCore';
import * as Icons from '@mui/icons-material';
import ComponentDialog from './ComponentDialog';

// Функція для визначення іконки за назвою топіка
const getIconByTopicName = (topicName) => {
  if (topicName.toLowerCase().includes('temperature')) {
    return <Icons.DeviceThermostat />;
  } else if (topicName.toLowerCase().includes('power')) {
    return <Icons.Bolt />;
  } else if (topicName.toLowerCase().includes('alert')) {
    return <Icons.Warning />;
  } else if (topicName.toLowerCase().includes('device')) {
    return <Icons.DeviceHub />;
  }
};

// Рекурсивна функція для створення дерева
const createTreeItems = (data, handleItemClick, parentKey = '') => {
  return Object.entries(data).map(([key, value]) => {
    const nodeId = parentKey ? `${parentKey}/${key}` : key;
    const icon = getIconByTopicName(key);
    const state = typeof value === 'object' ? JSON.stringify(value) : value; // Отримуємо стан

    if (typeof value === 'object' && value !== null) {
      return (
        <TreeItem key={nodeId} itemId={nodeId} label={key} icon={icon}>
          {createTreeItems(value, handleItemClick, nodeId)}
        </TreeItem>
      );
    } else {
      return (
        <TreeItem
          key={nodeId}
          itemId={nodeId}
          label={`${key}: ${state}`} // Додаємо стан до мітки
          icon={icon}
          onClick={() => handleItemClick({ key, value, stateTopic: nodeId })}
        />
      );
    }
  });
};


const TopicTreeViewer = ({ components, setComponents }) => {
  const [topicsStructure, setTopicsStructure] = useState({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newComponent, setNewComponent] = useState({
    type: 'sensor',
    label: '',
    stateTopic: '',
    commandTopic: '',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTopicsStructure({ ...MQTTCore.topics });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleItemClick = (topic) => {
    setNewComponent((prev) => ({
      ...prev,
      stateTopic: topic.stateTopic,
      label: topic.key,
    }));
    setIsDialogOpen(true);
  };

  const handleAddComponent = (newComponent) => {
    setComponents((prevComponents) => [
      ...prevComponents,
      { ...newComponent, id: Date.now() },
    ]);
    setIsDialogOpen(false);
    setNewComponent({
      type: 'sensor',
      label: '',
      stateTopic: '',
      commandTopic: '',
    });
  };

  return (
    <Box sx={{ padding: '20px', maxHeight: '400px', overflow: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Структура топіків
      </Typography>
      <SimpleTreeView
        aria-label="MQTT Topic Tree"
        sx={{ flexGrow: 1, maxHeight: 400, overflowY: 'auto' }}
      >
        {createTreeItems(topicsStructure, handleItemClick)}
      </SimpleTreeView>

      {/* Використовуємо ComponentDialog */}
      <ComponentDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleAddComponent}
        component={newComponent}
        isEdit={false}
      />
    </Box>
  );
};

export default TopicTreeViewer;
