import React, { useState, useEffect } from 'react';
import { Box, useTheme } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { db } from '../../core/db';
import eventBus from '../../core/EventBus';

export const SparklineGraph = ({ brokerId, topic, color = "#4fc3f7" }) => {
  const [dataPoints, setDataPoints] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    if (!brokerId || !topic) return;
    let isMounted = true;

    const loadHistory = async () => {
      try {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        const history = await db.history
          .where('[brokerId+topic]')
          .equals([brokerId, topic])
          .filter(item => item.timestamp >= cutoff)
          .sortBy('timestamp');
        
        if (isMounted) {
          setDataPoints(history.map(item => ({
            timestamp: item.timestamp,
            value: item.value
          })));
        }
      } catch (e) {
        console.error("Failed to load history for sparkline", e);
      }
    };

    loadHistory();

    const handleLiveMessage = (msgBrokerId, msgTopic, messageBuffer) => {
      if (msgBrokerId === brokerId && msgTopic === topic) {
        const val = parseFloat(messageBuffer.toString());
        if (!isNaN(val)) {
          setDataPoints(prev => {
            const newPt = { timestamp: Date.now(), value: val };
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
  }, [brokerId, topic]);

  if (dataPoints.length < 2) return null;

  return (
    <Box sx={{ 
      position: 'absolute', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      height: '40%', 
      opacity: 0.25, 
      pointerEvents: 'none',
      zIndex: 0
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dataPoints} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${topic.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={['auto', 'auto']} hide />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#spark-${topic.replace(/[^a-zA-Z0-9]/g, '')})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};
