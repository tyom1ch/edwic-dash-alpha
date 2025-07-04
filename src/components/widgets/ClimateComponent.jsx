// src/components/widgets/ClimateComponent.jsx
import { Card, CardContent, Typography, Box, IconButton, Select, MenuItem, Chip, Slider } from '@mui/material';
import { Add, Remove, Thermostat, PowerSettingsNew, AcUnit } from '@mui/icons-material';
import useEntity from '../../hooks/useEntity';
import commandDispatcher from '../../core/CommandDispatcher';

const ClimateComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  // Визначаємо режим роботи віджета на основі його конфігурації
  const isRangeMode = componentConfig.type === 'thermostat_range';

  // Читаємо всі можливі стани з об'єкта entity
  const currentTemperature = entity?.current_temperature ?? '---';
  const mode = entity?.mode ?? 'off';
  const action = entity?.action ?? 'idle';
  
  // Для звичайного режиму
  const targetTemperature = entity?.temperature ?? '---';
  
  // Для режиму діапазону
  const targetTempLow = entity?.temperature_low ?? '---';
  const targetTempHigh = entity?.temperature_high ?? '---'; // <--- ВИПРАВЛЕНО

  const { min_temp = 10, max_temp = 30, temp_step = 0.5, modes = ['off', 'heat'] } = componentConfig;
  const isOff = mode === 'off';

  // Обробник для звичайного режиму
  const handleSingleTemperatureChange = (increment) => {
    if (targetTemperature === '---') return;
    const newTemp = parseFloat(targetTemperature) + increment;
    if (newTemp >= min_temp && newTemp <= max_temp) {
      commandDispatcher.dispatch({
        entityId: componentConfig.id,
        commandKey: 'set_temperature',
        value: newTemp.toFixed(1),
      });
    }
  };
  
  // Обробник для режиму діапазону (викликається після того, як користувач відпустив повзунок)
  const handleRangeChange = (event, newValue) => {
      const [newLow, newHigh] = newValue;
      // Перевіряємо, чи дані вже завантажені
      if (targetTempLow === '---' || targetTempHigh === '---') return;

      // Відправляємо команду, лише якщо значення дійсно змінилося
      if (newLow.toFixed(1) !== parseFloat(targetTempLow).toFixed(1)) {
        commandDispatcher.dispatch({
          entityId: componentConfig.id,
          commandKey: 'set_temperature_low',
          value: newLow.toFixed(1),
        });
      }
      if (newHigh.toFixed(1) !== parseFloat(targetTempHigh).toFixed(1)) {
        commandDispatcher.dispatch({
          entityId: componentConfig.id,
          commandKey: 'set_temperature_high',
          value: newHigh.toFixed(1),
        });
      }
  };

  const handleModeChange = (event) => {
    commandDispatcher.dispatch({
      entityId: componentConfig.id,
      commandKey: 'set_mode',
      value: event.target.value,
    });
  };

  // Динамічний рендеринг UI
  let controls;
  if (isRangeMode) {
    const isRangeReady = targetTempLow !== '---' && targetTempHigh !== '---';
    controls = (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 'auto', px: 2, opacity: isOff ? 0.4 : 1 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
          {isRangeReady ? `${targetTempLow}° - ${targetTempHigh}°` : '---'}
        </Typography>
        <Slider
          value={isRangeReady ? [parseFloat(targetTempLow), parseFloat(targetTempHigh)] : [min_temp, max_temp]}
          onChangeCommitted={handleRangeChange}
          valueLabelDisplay="auto"
          min={min_temp}
          max={max_temp}
          step={temp_step}
          disabled={isOff || !isRangeReady}
        />
      </Box>
    );
  } else {
    controls = (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 'auto', opacity: isOff ? 0.4 : 1 }}>
        <IconButton onClick={() => handleSingleTemperatureChange(-temp_step)} disabled={isOff || targetTemperature === '---'}><Remove /></IconButton>
        <Typography variant="h4" sx={{ mx: 2, minWidth: '80px', textAlign: 'center', fontWeight: 'bold' }}>{targetTemperature}°</Typography>
        <IconButton onClick={() => handleSingleTemperatureChange(temp_step)} disabled={isOff || targetTemperature === '---'}><Add /></IconButton>
      </Box>
    );
  }

  const actionColor = action === 'heating' ? 'error.main' : action === 'cooling' ? 'info.main' : 'text.secondary';

  return (
    <Card sx={{ height: '100%', display: 'flex' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <Thermostat fontSize="large" color={isOff ? 'disabled' : 'action'} />
          <Typography variant="h3" sx={{ ml: 1, color: isOff ? 'text.secondary' : 'text.primary' }}>
            {currentTemperature}°
          </Typography>
        </Box>
        
        {controls}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Select value={mode} onChange={handleModeChange} variant="standard" sx={{textTransform: 'capitalize'}}>
            {modes.map((m) => (<MenuItem key={m} value={m} sx={{textTransform: 'capitalize'}}>{m}</MenuItem>))}
          </Select>
          <Chip
            icon={action === 'heating' ? <AcUnit sx={{color: 'white !important'}}/> : <PowerSettingsNew sx={{color: 'white !important'}}/>}
            label={action} size="small"
            sx={{ backgroundColor: actionColor, color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ClimateComponent;