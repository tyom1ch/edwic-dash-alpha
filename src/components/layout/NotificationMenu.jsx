import React, { useState, useEffect, useCallback } from "react";
import { 
  IconButton, Badge, Popover, Box, Typography, List, ListItem, 
  ListItemText, ListItemIcon, Divider, Button 
} from "@mui/material";
import { 
  Notifications as NotificationsIcon, 
  Warning as WarningIcon, 
  CheckCircleOutline as CheckIcon 
} from "@mui/icons-material";
import { db } from "../../core/db";
import eventBus from "../../core/EventBus";

export const NotificationMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const items = await db.notifications.orderBy('timestamp').reverse().limit(50).toArray();
      setNotifications(items);
      setUnreadCount(items.filter(item => item.read === 0).length);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const handleNewAlert = () => {
      loadNotifications();
    };

    eventBus.on("app:alert_triggered", handleNewAlert);
    return () => {
      eventBus.off("app:alert_triggered", handleNewAlert);
    };
  }, [loadNotifications]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const clearNativeNotifications = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.removeAllDeliveredNotifications();
      }
    } catch (e) {
      console.error("Failed to clear native notifications:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadItems = notifications.filter(n => n.read === 0);
      if (unreadItems.length > 0) {
        await Promise.all(unreadItems.map(item => 
          db.notifications.update(item.id, { read: 1 })
        ));
        loadNotifications();
      }
      clearNativeNotifications();
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  const markAsRead = async (id) => {
    try {
      await db.notifications.update(id, { read: 1 });
      loadNotifications();
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const clearAll = async () => {
    try {
      await db.notifications.clear();
      loadNotifications();
      handleClose();
      clearNativeNotifications();
    } catch (e) {
      console.error("Failed to clear notifications:", e);
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 350, maxHeight: 500, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Сповіщення</Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead}>
                Прочитано
              </Button>
            )}
          </Box>
          <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
            {notifications.length === 0 ? (
              <ListItem>
                <ListItemText primary="Немає нових сповіщень" sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }} />
              </ListItem>
            ) : (
              notifications.map((notif) => (
                <React.Fragment key={notif.id}>
                  <ListItem 
                    alignItems="flex-start" 
                    sx={{ 
                      bgcolor: notif.read === 0 ? 'action.hover' : 'transparent',
                      cursor: notif.read === 0 ? 'pointer' : 'default'
                    }}
                    onClick={() => notif.read === 0 && markAsRead(notif.id)}
                  >
                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                      {notif.read === 0 ? <WarningIcon color="warning" /> : <CheckIcon color="disabled" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={notif.title}
                      secondary={
                        <React.Fragment>
                          <Typography component="span" variant="body2" color="text.primary" display="block">
                            {notif.message}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.secondary">
                            {new Date(notif.timestamp).toLocaleString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))
            )}
          </List>
          {notifications.length > 0 && (
             <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
                <Button size="small" color="inherit" onClick={clearAll}>
                  Очистити всі
                </Button>
             </Box>
          )}
        </Box>
      </Popover>
    </>
  );
};
