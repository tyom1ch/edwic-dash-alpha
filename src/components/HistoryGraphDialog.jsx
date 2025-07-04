// src/components/HistoryGraphDialog.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  TextField,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Читаємо URL безпосередньо зі змінних середовища
const API_BASE_URL = import.meta.env.VITE_HISTORY_API_URL;

function HistoryGraphDialog({ isOpen, onClose, sensorWidget }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const chartRef = useRef(null);

  useEffect(() => {
    if (isOpen && sensorWidget) {
      const now = new Date();
      const startOfDayYesterday = new Date(now);
      startOfDayYesterday.setDate(now.getDate() - 1);
      startOfDayYesterday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const formatForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setStartTime(formatForInput(startOfDayYesterday));
      setEndTime(formatForInput(endOfToday));

      fetchHistoryData(
        startOfDayYesterday.toISOString(),
        endOfToday.toISOString()
      );
    }
  }, [isOpen, sensorWidget]);

  const fetchHistoryData = async (start, end) => {
    if (!sensorWidget || !start || !end) {
      setData([]);
      return;
    }

    // Перевіряємо, чи була змінна середовища визначена
    if (!API_BASE_URL) {
      setError("URL для API історії не визначена у вашому .env файлі. Будь ласка, додайте змінну VITE_HISTORY_API_URL.");
      setLoading(false);
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start_time: start,
        end_time: end,
        topic: sensorWidget.state_topic,
        limit: 10000,
      });
      const url = `${API_BASE_URL}/messages?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      const processedData = result.messages
        .map((msg) => ({ x: new Date(msg.timestamp), y: parseFloat(msg.payload) }))
        .filter((d) => !isNaN(d.y));
      processedData.sort((a, b) => a.x - b.x);
      setData(processedData);
    } catch (e) {
      console.error("Failed to fetch history data:", e);
      setError(`Не вдалося завантажити дані для графіка: ${e.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTimeRange = () => {
    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();
    if (startIso === "Invalid Date" || endIso === "Invalid Date") {
      setError("Будь ласка, введіть коректні дати та час.");
      return;
    }
    setError(null);
    fetchHistoryData(startIso, endIso);
  };

  const chartData = {
    datasets: [
      {
        label: `${sensorWidget?.label || "Сенсор"} (${sensorWidget?.unit_of_measurement || ""})`,
        data: data,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        tension: 0.1,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { type: "time", time: { unit: "minute", tooltipFormat: "dd.MM.yyyy HH:mm:ss", displayFormats: { minute: "HH:mm", hour: "dd.MM HH:mm", day: "dd.MM", month: "MMM yyyy" } }, title: { display: true, text: "Час" } },
      y: { title: { display: true, text: "Значення" } },
    },
    plugins: { legend: { position: "top" }, tooltip: { mode: "index", intersect: false } },
    hover: { mode: "nearest", intersect: true },
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        Історія віджета: {sensorWidget?.label}
        <IconButton aria-label="close" onClick={onClose} sx={{ position: "absolute", right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
          <TextField label="З" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
          <TextField label="До" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
          <Button variant="contained" onClick={handleApplyTimeRange}>Застосувати</Button>
        </Box>
        {loading && <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>}
        {error && <Typography color="error" sx={{ textAlign: "center", p: 4 }}>{error}</Typography>}
        {!loading && !error && data.length === 0 && <Typography sx={{ textAlign: "center", p: 4 }}>Немає даних для відображення в обраному діапазоні.</Typography>}
        {!loading && !error && data.length > 0 && <Box sx={{ height: 400 }}><Line ref={chartRef} options={chartOptions} data={chartData} /></Box>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Закрити</Button></DialogActions>
    </Dialog>
  );
}

export default HistoryGraphDialog;