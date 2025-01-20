import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import SwitchControl from './SwitchControl';
import SwitchNew from './SwitchNew';
import SensorComponent from './SensorComponent';
import InputBox from './InputBox'; // Імпорт нового компонента

const CustomComponent = ({ type, props }) => {
  switch (type) {
    case 'switch':
      return <SwitchControl {...props} />;
      // return <SwitchNew {...props} />;
    case 'sensor':
    case 'binary_sensor':
      return <SensorComponent {...props} />;
    case 'number':
    case 'input': // Додаємо новий кейс для InputBox
      return <InputBox {...props} />;
    default:
      return (
        <Card variant="outlined" sx={{ minWidth: 275, mb: 2 }}>
          <CardContent>
            <Typography variant="h6">Невідомий компонент</Typography>
          </CardContent>
        </Card>
      );
  }
};

export default CustomComponent;
