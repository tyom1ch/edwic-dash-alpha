// src/core/db.js
import Dexie from 'dexie';

export const db = new Dexie('EdwicDashDatabase');

// Define the schema. We just need a simple key-value store for appConfig.
db.version(1).stores({
  config: 'id' // Primary key is 'id'
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
