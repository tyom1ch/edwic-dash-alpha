// src/components/widgets/HistoryGraphWidget.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { db } from '../../core/db';
import eventBus from '../../core/EventBus';
import WidgetWrapper from './WidgetWrapper';

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
    const theme = useTheme();

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
                        timestamp: item.timestamp,
                        value: item.value
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
                        const newPt = { timestamp: Date.now(), value: val };
                        // keep only last points locally (e.g. 500) so the live array doesn't crash browser
                        return [...prev, newPt].slice(-500);
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

    // Format X Axis timestamp
    const formatTime = (unixTime) => {
        const d = new Date(unixTime);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
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
                    <Typography variant="subtitle2" color={color} fontWeight="bold">
                        {payload[0].value}
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    return (
        <WidgetWrapper component={component} isEditMode={isEditMode}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CardContent sx={{ flexGrow: 1, p: 0, pb: "0px !important", display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ px: 2, pt: 2, pb: 1, zIndex: 1 }}>
                        <Typography variant="body1" fontWeight={500} color="text.secondary" noWrap>
                            {title || graph_topic || 'Графік'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mt: 0.5 }}>
                            <Typography variant="h4" fontWeight="bold">
                                {dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : '--'}
                            </Typography>
                        </Box>
                    </Box>
                    
                    <Box sx={{ flexGrow: 1, minHeight: 100, width: '100%', mt: -1 }}>
                        {(!brokerId || !graph_topic) ? (
                            <Typography variant="body2" color="error" textAlign="center" mt={4}>Не налаштовано топік</Typography>
                        ) : dataPoints.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>Немає даних...</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dataPoints} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`colorGradient-${component.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="timestamp" 
                                        tickFormatter={formatTime} 
                                        minTickGap={40}
                                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={-10}
                                    />
                                    <YAxis 
                                        domain={['auto', 'auto']}
                                        hide={true} // Home Assistant style hides Y axis
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: theme.palette.divider, strokeWidth: 1, strokeDasharray: '3 3' }} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke={color} 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill={`url(#colorGradient-${component.id})`}
                                        isAnimationActive={false}
                                        activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </WidgetWrapper>
    );
}

export default HistoryGraphWidget;
