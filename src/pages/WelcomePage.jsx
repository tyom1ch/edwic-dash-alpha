import React, { useRef } from "react";
import { Box, Typography, Button, Container, Grid, Paper, Stack } from "@mui/material";
import {
  NotificationsActive,
  BatteryAlert,
  Sync,
  UploadFile,
  AddCircleOutline
} from "@mui/icons-material";
import MuiAlert from '@mui/material/Alert';

const WelcomePage = ({ setAppConfig, handleFinishWelcome }) => {
  const fileInputRef = useRef(null);
  const [errorSnackbar, setErrorSnackbar] = React.useState({ open: false, message: "" });

  const onStartFresh = () => {
    handleFinishWelcome();
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        
        // Ensure imported config acts as a "seen welcome" bypass
        parsed.hasSeenWelcome = true;

        if (setAppConfig) {
          setAppConfig(parsed);
        }
      } catch (error) {
        setErrorSnackbar({
          open: true,
          message: "Не вдалося розпарсити файл конфігурації. Переконайтесь, що це правильний JSON."
        });
        console.error("Import error:", error);
      }
    };
    reader.readAsText(file);
    // Reset standard input
    e.target.value = null;
  };

  return (
    <Container maxWidth="md" sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3, width: "100%" }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" fontWeight="bold">
          Ласкаво просимо до Edwic Dashboard
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" paragraph sx={{ mb: 4 }}>
          Потужний MQTT клієнт для керування розумним будинком
        </Typography>

        <Box sx={{ mb: 5 }}>
          <Typography variant="h5" gutterBottom color="primary.main">
            ⚠️ Важливі налаштування (Android)
          </Typography>
          <Typography variant="body1" paragraph>
            Для того, щоб застосунок міг працювати у фоновому режимі та ви могли отримувати сповіщення (Алерти)
            у будь-який час, необхідно виконати такі кроки в налаштуваннях вашого пристрою:
          </Typography>

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <Stack alignItems="center" spacing={1} textAlign="center">
                <NotificationsActive color="primary" sx={{ fontSize: 40 }} />
                <Typography variant="subtitle1" fontWeight="bold">Дозволити сповіщення</Typography>
                <Typography variant="body2" color="text.secondary">
                  Без цього ви не побачите Push-сповіщень від ваших налаштованих алертів.
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Stack alignItems="center" spacing={1} textAlign="center">
                <Sync color="primary" sx={{ fontSize: 40 }} />
                <Typography variant="subtitle1" fontWeight="bold">Фонова синхронізація</Typography>
                <Typography variant="body2" color="text.secondary">
                  Застосунок створює "Тихе сповіщення" у фоні, щоб утримувати підключення до брокера через WebSockets.
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Stack alignItems="center" spacing={1} textAlign="center">
                <BatteryAlert color="error" sx={{ fontSize: 40 }} />
                <Typography variant="subtitle1" fontWeight="bold">Вимкнути оптимізацію батареї!</Typography>
                <Typography variant="body2" color="text.secondary">
                  Обов'язково зайдіть у налаштування телефону та <b>Вимкніть оптимізацію акумулятора</b> для Edwic Dashboard. Інакше Android "вб'є" фоновий процес через 10 хвилин.
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, justifyContent: "center", mt: 6 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddCircleOutline />}
            onClick={onStartFresh}
            sx={{ px: 4, py: 1.5 }}
          >
            Почати з нуля
          </Button>

          <input
            type="file"
            accept=".json"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            variant="outlined"
            color="secondary"
            size="large"
            startIcon={<UploadFile />}
            onClick={handleImportClick}
            sx={{ px: 4, py: 1.5 }}
          >
            Імпортувати конфігурацію (.json)
          </Button>
        </Box>
      </Paper>
      
      {/* Error Snackbar */}
      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbar({ ...errorSnackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setErrorSnackbar({ ...errorSnackbar, open: false })} 
          severity="error" 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {errorSnackbar.message}
        </MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default WelcomePage;
