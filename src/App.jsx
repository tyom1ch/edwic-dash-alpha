import React from 'react';
import {
  AppBar, Toolbar, Typography, Button, Container, Box, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Link, CssBaseline
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AdbIcon from '@mui/icons-material/Adb'; // Example Icon

// Create a dark theme inspired by the original design
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  typography: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 900,
      fontSize: '3.5rem',
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      paddingBottom: '0.5rem',
      display: 'inline-block',
      marginBottom: '2rem',
    },
    h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
    }
  },
});

const Header = () => (
  <Box sx={{ textAlign: 'center', py: { xs: 8, md: 12 } }}>
    <Container maxWidth="md">
      <Typography variant="h1" component="h1" gutterBottom>
        Edwic.Dash
      </Typography>
      <Typography variant="h5" component="p" color="text.secondary" sx={{ mb: 1 }}>
        Ваш швидкий, легкий та повністю автономний MQTT дашборд.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Працює виключно у вашому браузері. Без бекенду. Без зайвих складнощів.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button href="#getting-started" variant="contained" color="secondary" size="large">
          Почати роботу
        </Button>
        <Button href="https://github.com/tyom1ch/edwic-dash-alpha" target="_blank" rel="noopener noreferrer" variant="outlined" color="secondary" size="large">
          Переглянути на GitHub
        </Button>
      </Box>
    </Container>
  </Box>
);

const features = [
  {
    title: "Повна Автономність",
    description: "React-додаток працює у браузері та підключається до MQTT брокера напряму через WebSockets. Ніякого серверного коду чи залежностей."
  },
  {
    title: "Автоматичне Виявлення",
    description: "Підтримка стандарту Home Assistant MQTT Discovery дозволяє додавати сумісні пристрої без ручного налаштування топіків."
  },
  {
    title: "Гнучкий Інтерфейс",
    description: "Створюйте кілька дашбордів. Перетягуйте та змінюйте розмір віджетів у зручній сітці, яка блокується для уникнення випадкових змін."
  },
  {
    title: "Легке Розгортання",
    description: "Запустіть через готовий Docker-образ, розмістіть на будь-якому статичному хостингу або зберіть у нативний Android додаток."
  }
];

const Features = () => (
  <Container sx={{ py: 8 }} maxWidth="lg">
    <Typography variant="h2" component="h2" align="center">
      Ключові можливості
    </Typography>
    <Grid sx={{ display: 'flex', flexWrap:"nowrap",}} container spacing={4}>
      {features.map(feature => (
        <Grid item xs={12} sm={6} md={3} key={feature.title}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: "8px", border: '1px solid #333', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' } }}>
            <CardContent>
              <Typography variant="h3" component="h3" gutterBottom>
                {feature.title}
              </Typography>
              <Typography color="text.secondary">
                {feature.description}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Container>
);

const HowItWorks = () => (
    <Container sx={{ py: 8 }} maxWidth="md">
        <Typography variant="h2" component="h2" align="center">
            Як це працює?
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Edwic.Dash використовує архітектуру "Frontend-Only". Вся логіка знаходиться у вашому браузері.
        </Typography>
        <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2a2a2a', fontFamily: 'monospace', border: '1px solid #444' }}>
            <Typography component="p"><strong>[Ваш Браузер (React App)]</strong> &lt;---&gt; <strong>[MQTT Брокер]</strong> &lt;---&gt; <strong>[Ваші Пристрої]</strong></Typography>
            <Typography component="p" sx={{mt: 1}}>Конфігурація зберігається локально у `localStorage`.</Typography>
            <Typography component="p" sx={{mt: 1}}>Історія значень завантажується із зовнішніх систем (напр. InfluxDB).</Typography>
        </Paper>
    </Container>
);

const comparisonData = [
    { characteristic: "Архітектура", edwic: "Клієнт-сайд (Frontend-Only)", ha: "Клієнт-сервер" },
    { characteristic: "Основна функція", edwic: "Візуалізація та керування MQTT", ha: "Центр автоматизації будинку" },
    { characteristic: "Зберігання даних", edwic: "localStorage браузера", ha: "Файли та база даних (SQL)" },
    { characteristic: "Історія даних", edwic: "Не зберігає, лише візуалізує", ha: "Зберігає у власну БД" },
    { characteristic: "Автоматизації", edwic: "Відсутні", ha: "Основна функція" },
    { characteristic: "Інтеграції", edwic: "Тільки MQTT", ha: "Тисячі інтеграцій" },
    { characteristic: "Вимоги до ресурсів", edwic: "Мінімальні (лише браузер)", ha: "Значні (потрібен сервер 24/7)" },
];

const Comparison = () => (
    <Container sx={{ py: 8 }} maxWidth="lg">
        <Typography variant="h2" component="h2" align="center">
            Edwic.Dash чи Home Assistant?
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Edwic.Dash не є конкурентом Home Assistant, а скоріше його легким та швидким доповненням.
        </Typography>
        <TableContainer component={Paper} sx={{ border: '1px solid #333' }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{fontWeight: 'bold'}}>Характеристика</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}}>Edwic.Dash</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}}>Home Assistant</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {comparisonData.map((item) => (
                        <TableRow key={item.characteristic} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'rgba(255, 255, 255, 0.05)' } }}>
                            <TableCell component="th" scope="row" sx={{color: 'primary.main', fontWeight: 'bold'}}>
                                {item.characteristic}
                            </TableCell>
                            <TableCell>{item.edwic}</TableCell>
                            <TableCell>{item.ha}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    </Container>
);

const GettingStarted = () => (
    <Container id="getting-started" sx={{ py: 8 }} maxWidth="md">
        <Typography variant="h2" component="h2" align="center">
            Почніть за хвилину
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Найпростіший спосіб почати — використати готовий Docker-образ.
        </Typography>
        <Paper elevation={3} sx={{ p: 2, backgroundColor: '#111', fontFamily: 'monospace', color: '#f1f1f1', border: '1px solid #444' }}>
            <code>
                docker run -p 8080:80 ghcr.io/tyom1ch/edwic-dash-alpha:latest
            </code>
        </Paper>
    </Container>
);

const Footer = () => (
  <Box component="footer" sx={{ py: 6, borderTop: '1px solid #333', textAlign: 'center' }}>
    <Container maxWidth="lg">
      <Typography variant="body2" color="text.secondary" gutterBottom>
        © {new Date().getFullYear()} Edwic.Dash. Створено з натхненням.
      </Typography>
      <Link href="#" color="secondary" sx={{ mx: 1 }}>Документація [Скоро]</Link>
    </Container>
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <main>
        <Header />
        <Features />
        <HowItWorks />
        <Comparison />
        <GettingStarted />
      </main>
      <Footer />
    </ThemeProvider>
  );
}

export default App;