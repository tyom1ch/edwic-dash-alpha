// src/core/db.js
import Dexie from 'dexie';

export const db = new Dexie('EdwicDashDatabase');

// Define the schema. We just need a simple key-value store for appConfig.
db.version(1).stores({
  config: 'id' // Primary key is 'id'
});

db.version(2).stores({
  config: 'id',
  history: '++id, [brokerId+topic], topic, timestamp' 
});

db.version(3).stores({
  config: 'id',
  history: '++id, [brokerId+topic], topic, timestamp',
  notifications: '++id, timestamp, read' 
});

db.version(4).stores({
  config: 'id',
  history: '++id, [brokerId+topic], topic, timestamp',
  notifications: '++id, timestamp, read',
  topicCache: '[brokerId+topic]' 
});

export const saveAppConfig = async (configData) => {
  try {
    await db.config.put({ id: 'main-config', ...configData });
  } catch (error) {
    console.error("Failed to save app config to Dexie:", error);
  }
};

export const getAppConfig = async () => {
  try {
    const data = await db.config.get('main-config');
    return data;
  } catch (error) {
    console.error("Failed to load app config from Dexie:", error);
    return null;
  }
};

export const addNotificationIfNotExists = async (notification) => {
  try {
    // Check if an identical notification was recently inserted (within the last few seconds)
    // Dexie doesn't have multi-column unique indexes by default here so we just search
    const exists = await db.notifications
      .where('timestamp')
      .between(notification.timestamp - 15000, notification.timestamp + 15000, true, true)
      .filter(n => n.title === notification.title && n.message === notification.message)
      .first();

    if (!exists) {
      await db.notifications.put(notification);
      return true;
    }
    return false;
  } catch (e) {
    console.error("Failed to deduplicate notification:", e);
    return false;
  }
};

export const pruneNotifications = async () => {
  try {
    const count = await db.notifications.count();
    if (count > 100) {
      const excess = count - 100;
      const oldestKeys = await db.notifications.orderBy('timestamp').limit(excess).primaryKeys();
      if (oldestKeys.length > 0) {
        await db.notifications.bulkDelete(oldestKeys);
      }
    }
  } catch (error) {
    console.error("Failed to prune notifications:", error);
  }
};
