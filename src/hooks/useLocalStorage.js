import { useState, useEffect } from "react";

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return initialValue;

      try {
        return JSON.parse(item);
      } catch {
        console.warn(`localStorage ${key} було не в JSON, автофікс`);
        localStorage.setItem(key, JSON.stringify(item));
        return item;
      }
    } catch (error) {
      console.error("Помилка читання localStorage:", error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Помилка запису localStorage:", error);
    }
  };

  return [storedValue, setValue];
};

export default useLocalStorage;
