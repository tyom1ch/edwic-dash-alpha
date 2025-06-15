// import React, { useEffect, useState } from "react";
// import { Typography, Card, CardContent, Box } from "@mui/material";
// import MQTTCore from "../core/MQTTCore"; // Імпортуємо MQTTCore

// const SensorComponent = ({ stateTopic, label, unit }) => {
//   const [state, setState] = useState(null);

//   useEffect(() => {
//     const handleUpdate = (newState) => {
//       setState(newState); // Оновлюємо стан при зміні топіка
//     };

//     // Підписуємося на оновлення для вказаного топіка
//     MQTTCore.subscribe(stateTopic, handleUpdate);

//     // Ініціалізуємо початковий стан з кешу
//     const initialState = MQTTCore.getState(stateTopic);
//     if (initialState !== null) {
//       setState(initialState);
//     }

//     // Очищаємо підписку при розмонтуванні компонента
//     return () => {
//       MQTTCore.unsubscribe(stateTopic, handleUpdate);
//     };
//   }, [stateTopic]);

//   return (
//     <Card
//       variant="outlined"
//       sx={{
//         minWidth: 275,
//         height: 100, // Встановлюємо однакову висоту
//         mb: 2,
//         overflow: "hidden",
//       }}
//     >
//       <Box
//         sx={{
//           width: "100%",
//           height: "100%", // Розтягуємо на всю висоту картки
//           display: "block",
//           textAlign: "left",
//         }}
//       >
//         <CardContent>
//           <Typography color="textSecondary" variant="h6" sx={{ paddingRight: 6 }}>{label}</Typography>
//           {!state ? (
//             <Typography color="textSecondary">Завантаження...</Typography>
//           ) : (
//             <Typography variant="h5">{state} {unit}</Typography>
//           )}
//         </CardContent>
//       </Box>
//     </Card>
//   );
// };

// export default SensorComponent;

// src/components/widgets/SensorComponent.jsx
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import useEntity from '../../hooks/useEntity';

const SensorComponent = ({ componentConfig }) => {
  // Використовуємо наш хук, передаючи ID компонента як ID сутності.
  const entity = useEntity(componentConfig.id);

  // Визначаємо значення та одиниці виміру для відображення
  const value = entity?.value ?? '---';
  const unit = componentConfig.unit_of_measurement || '';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="div">
          {componentConfig.label || 'Sensor'}
        </Typography>
        <Box 
            sx={{ 
                display: 'flex', 
                alignItems: 'baseline', 
                justifyContent: 'center', 
                mt: 2 
            }}
        >
          <Typography variant="h3" component="span">
            {value}
          </Typography>
          {unit && (
            <Typography variant="h5" component="span" sx={{ ml: 1 }}>
              {unit}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" align="center">
          {entity?.last_updated ? new Date(entity.last_updated).toLocaleString() : 'No updates yet'}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SensorComponent;