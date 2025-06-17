// src/hooks/useEntity.js
import { useState, useEffect, useCallback } from 'react'; // Додаємо useCallback
import deviceRegistry from '../core/DeviceRegistry';
import eventBus from '../core/EventBus';

const useEntity = (entityId) => {
  // Функція для отримання початкового стану.
  // Вона буде викликатися тільки один раз при першому рендері.
  const getInitialState = () => {
    const initialState = deviceRegistry.getEntity(entityId);
    // console.log(`[useEntity] Getting initial state for ${entityId}:`, initialState);
    return initialState;
  };
  
  const [entity, setEntity] = useState(getInitialState);

  // Використовуємо useCallback, щоб функція handleUpdate не створювалася заново на кожному рендері.
  const handleUpdate = useCallback((updatedEntity) => {
    if (updatedEntity && String(updatedEntity.id) === String(entityId)) {
      // console.log(`[useEntity] Matched and updating component for entityId: ${entityId}`);
      setEntity(updatedEntity);
    }
  }, [entityId]); // Залежність тільки від entityId

  useEffect(() => {
    // --- ВАЖЛИВА ПЕРЕВІРКА ---
    // Коли компонент монтується знову, його початковий стан може бути застарілим.
    // Отримаємо найсвіжіший стан ще раз, на випадок якщо він оновився,
    // поки компонента не було на екрані.
    const currentState = deviceRegistry.getEntity(entityId);
    if (currentState && currentState.value !== entity?.value) {
      setEntity(currentState);
    }
    
    // Підписуємось на майбутні оновлення.
    eventBus.on('entity:update', handleUpdate);

    // Прибираємо слухача, коли компонент розмонтовується.
    return () => {
      eventBus.off('entity:update', handleUpdate);
    };
  }, [entityId, handleUpdate, entity?.value]); // Додаємо залежності

  return entity;
};

export default useEntity;