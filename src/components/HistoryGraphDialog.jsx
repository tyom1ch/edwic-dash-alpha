// src/components/HistoryGraphDialog.jsx
import React, { useState, useEffect } from "react";
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
  useTheme
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { db } from "../core/db";
import useAppConfig from "../hooks/useAppConfig"; // To get active broker list if needed

function HistoryGraphDialog({ isOpen, onClose, sensorWidget }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  const theme = useTheme();
  const { appConfig } = useAppConfig();

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
        startOfDayYesterday.getTime(),
        endOfToday.getTime()
      );
    }
  }, [isOpen, sensorWidget]);

  const fetchHistoryData = async (startMs, endMs) => {
    if (!sensorWidget || !startMs || !endMs) {
      setData([]);
      return;
    }
    
    // Fallbacks if sensor doesn't enforce its own broker
    const brokerId = sensorWidget.brokerId || (appConfig?.brokers?.[0]?.id);
    const topic = sensorWidget.state_topic;

    if (!brokerId || !topic) {
      setError("Топік або брокер не налаштовані.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const historyItems = await db.history
        .where('[brokerId+topic]')
        .equals([brokerId, topic])
        .filter(item => item.timestamp >= startMs && item.timestamp <= endMs)
        .sortBy('timestamp');

      const processedData = historyItems.map(item => ({
        timestamp: item.timestamp,
        value: item.value
      }));

      setData(processedData);
    } catch (e) {
      console.error("Failed to fetch history data from Dexie:", e);
      setError(`Не вдалося завантажити локальні дані: ${e.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTimeRange = () => {
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    if (isNaN(startMs) || isNaN(endMs)) {
      setError("Будь ласка, введіть коректні дати та час.");
      return;
    }
    fetchHistoryData(startMs, endMs);
  };

  // Format X Axis timestamp for expanded view
  const formatTime = (unixTime) => {
    const d = new Date(unixTime);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // Advanced Tooltip Formatter
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <Box sx={{ 
                bgcolor: 'background.paper', 
                p: 1.5, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                boxShadow: theme.shadows[3]
             }}>
                <Typography variant="body2" color="text.secondary" mb={0.5}>
                    {new Date(label).toLocaleString()}
                </Typography>
                <Typography variant="subtitle2" color="primary" fontWeight="bold">
                    {payload[0].value} {sensorWidget?.unit_of_measurement || ""}
                </Typography>
            </Box>
        );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        Історія віджета: {sensorWidget?.label || "Сенсор"}
        <IconButton aria-label="close" onClick={onClose} sx={{ position: "absolute", right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}>
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <TextField label="З" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1, minWidth: 200 }} />
          <TextField label="До" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1, minWidth: 200 }} />
          <Button variant="contained" onClick={handleApplyTimeRange} sx={{ height: 56 }}>Застосувати</Button>
        </Box>
        
        {loading && <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>}
        {error && <Typography color="error" sx={{ textAlign: "center", p: 4 }}>{error}</Typography>}
        {!loading && !error && data.length === 0 && <Typography sx={{ textAlign: "center", p: 4 }}>Немає локальних даних для відображення (спробуйте почекати нових повідомлень від брокера).</Typography>}
        
        {!loading && !error && data.length > 0 && (
          <Box sx={{ height: 400, width: "100%", mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorGradientExpanded" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                    <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTime} 
                        minTickGap={50}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    />
                    <YAxis 
                        domain={['auto', 'auto']}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        width={40}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: theme.palette.divider, strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={theme.palette.primary.main} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorGradientExpanded)"
                        isAnimationActive={true}
                        activeDot={{ r: 5, strokeWidth: 0, fill: theme.palette.primary.main }}
                    />
                </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрити</Button>
      </DialogActions>
    </Dialog>
  );
}

export default HistoryGraphDialog;