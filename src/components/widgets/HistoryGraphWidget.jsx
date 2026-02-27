// src/components/widgets/HistoryGraphWidget.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, Filler } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { db } from '../../core/db';
import eventBus from '../../core/EventBus';
import WidgetWrapper from './WidgetWrapper';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, Filler);

export const HistoryGraphWidgetConfig = {
    id: 'history-graph',
    name: 'Історичний графік',
    getTopicMappings: (config) => ({
        graph_topic: config.graph_topic,
    }),
    defaultGridOptions: { columns: 2, rows: 2 },
};

function HistoryGraphWidget({ component, isEditMode }) {
    const { title, brokerId, graph_topic, color = '#2196f3' } = component;
    const [dataPoints, setDataPoints] = useState([]);

    useEffect(() => {
        if (!brokerId || !graph_topic) return;

        let isMounted = true;
        
        const loadHistory = async () => {
            try {
                // Fetch up to last 24h
                const cutoff = Date.now() - (24 * 60 * 60 * 1000);
                const history = await db.history
                    .where('[brokerId+topic]')
                    .equals([brokerId, graph_topic])
                    .filter(item => item.timestamp >= cutoff)
                    .sortBy('timestamp');
                
                if (isMounted) {
                    setDataPoints(history.map(item => ({
                        x: item.timestamp,
                        y: item.value
                    })));
                }
            } catch (e) {
                console.error("Failed to load history for chart", e);
            }
        };

        loadHistory();

        const handleLiveMessage = (msgBrokerId, msgTopic, messageBuffer) => {
            if (msgBrokerId === brokerId && msgTopic === graph_topic) {
                const val = parseFloat(messageBuffer.toString());
                if (!isNaN(val)) {
                    setDataPoints(prev => {
                        const newPt = { x: Date.now(), y: val };
                        return [...prev, newPt];
                    });
                }
            }
        };

        eventBus.on('mqtt:raw_message', handleLiveMessage);

        return () => {
            isMounted = false;
            eventBus.off('mqtt:raw_message', handleLiveMessage);
        };
    }, [brokerId, graph_topic]);

    const chartData = {
        datasets: [{
            label: title || 'Значення',
            data: dataPoints,
            borderColor: color,
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                gradient.addColorStop(0, `${color}66`); // 40% opacity
                gradient.addColorStop(1, `${color}00`); // 0% opacity
                return gradient;
            },
            fill: true,
            tension: 0.4, // Smooth curve
            borderWidth: 2,
            pointRadius: 0, // hide dots until hover
            pointHoverRadius: 5,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 }, // Disable animation for live updates
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'minute',
                    displayFormats: { minute: 'HH:mm', hour: 'HH:mm' },
                    tooltipFormat: 'dd MMM, HH:mm:ss'
                },
                grid: { display: false },
                ticks: { autoSkip: true, maxTicksLimit: 6 }
            },
            y: {
                grid: { color: 'rgba(128, 128, 128, 0.1)' }
            }
        },
        plugins: {
            legend: { display: false }
        }
    };

    return (
        <WidgetWrapper component={component} isEditMode={isEditMode}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, p: 2, pb: "16px !important", display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" color="text.secondary" noWrap>
                        {title || graph_topic || 'Графік'}
                    </Typography>
                    <Box sx={{ flexGrow: 1, minHeight: 0, mt: 1 }}>
                        {(!brokerId || !graph_topic) ? (
                             <Typography variant="body2" color="error" textAlign="center" mt={4}>Не налаштовано топік</Typography>
                        ) : dataPoints.length === 0 ? (
                             <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>Немає даних або завантаження...</Typography>
                        ) : (
                             <Line data={chartData} options={chartOptions} />
                        )}
                    </Box>
                </CardContent>
            </Card>
        </WidgetWrapper>
    );
}

export default HistoryGraphWidget;
