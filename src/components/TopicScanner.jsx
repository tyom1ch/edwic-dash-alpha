import React, { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import MQTTCore from '../core/MQTTCore';

const TopicScanner = () => {
  const [subscribedTopics, setSubscribedTopics] = useState([]);
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [topicsStructure, setTopicsStructure] = useState({});

  // Обновлюємо структуру топіків у реальному часі
  useEffect(() => {
    const interval = setInterval(() => {
      setTopicsStructure({ ...MQTTCore.topics });
    }, 1000); // Оновлення щосекунди

    return () => clearInterval(interval);
  }, []);

  // Функція для обробки нових повідомлень
  const handleMessage = (topic, message) => {
    setReceivedMessages((prevMessages) => [
      { topic, message, timestamp: new Date().toLocaleString() },
      ...prevMessages,
    ]);
  };

  // Підписка на новий топік
  const handleSubscribe = () => {
    if (!newTopic) return;

    try {
      MQTTCore.subscribe(newTopic, handleMessage);
      if (!subscribedTopics.includes(newTopic)) {
        setSubscribedTopics((prevTopics) => [...prevTopics, newTopic]);
      }
      setNewTopic('');
    } catch (error) {
      console.error(`❌ Помилка підписки на топік "${newTopic}":`, error.message);
    }
  };

  // Відписка від топіка
  const handleUnsubscribe = (topic) => {
    try {
      MQTTCore.unsubscribe(topic);
      setSubscribedTopics((prevTopics) => prevTopics.filter((t) => t !== topic));
    } catch (error) {
      console.error(`❌ Помилка відписки від топіка "${topic}":`, error.message);
    }
  };

  return (
    <Box sx={{ padding: '20px', display: 'flex', gap: 2 }}>
      <Box sx={{ flex: 2 }}>
        <Typography variant="h4" gutterBottom>
          Сканер топіків
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="Топік для підписки"
            fullWidth
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={handleSubscribe}>
            Підписатися
          </Button>
        </Box>
        <Typography variant="h6" gutterBottom>
          Підписані топіки:
        </Typography>
        <Box sx={{ mb: 3 }}>
          {subscribedTopics.map((topic) => (
            <Box
              key={topic}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
                p: 1,
                border: '1px solid #ddd',
                borderRadius: '5px',
              }}
            >
              <Typography>{topic}</Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleUnsubscribe(topic)}
              >
                Відписатися
              </Button>
            </Box>
          ))}
        </Box>
        <Typography variant="h6" gutterBottom>
          Отримані повідомлення:
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Топік</TableCell>
              <TableCell>Повідомлення</TableCell>
              <TableCell>Час</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {receivedMessages.map((msg, index) => (
              <TableRow key={index}>
                <TableCell>{msg.topic}</TableCell>
                <TableCell>{msg.message}</TableCell>
                <TableCell>{msg.timestamp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Box sx={{ flex: 1 }}>
        <Card variant="outlined" sx={{ maxHeight: '400px', overflow: 'auto', p: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Структура топіків
            </Typography>
            <Box
              component="pre"
              sx={{
                backgroundColor: '#f4f4f4',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '10px',
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(topicsStructure, null, 2)}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default TopicScanner;
