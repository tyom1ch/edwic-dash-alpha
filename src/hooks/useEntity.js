// src/hooks/useEntity.js
import { useState, useEffect } from 'react';
import deviceRegistry from '../core/DeviceRegistry';
import eventBus from '../core/EventBus';

/**
 * Хук для отримання та відстеження стану однієї сутності (entity).
 * @param {string} entityId - ID сутності, за якою потрібно стежити.
 * @returns {object | null} - Об'єкт сутності або null, якщо її ще не знайдено.
 */
const useEntity = (entityId) => {
  // 1. Отримуємо початковий стан сутності напряму з реєстру.
  const [entity, setEntity] = useState(() => deviceRegistry.getEntity(entityId));

  useEffect(() => {
    // Функція, яка буде викликатись при оновленні будь-якої сутності
    const handleUpdate = (updatedEntity) => {
      // 2. Перевіряємо, чи це оновлення саме тієї сутності, яка нам потрібна.
      if (updatedEntity && updatedEntity.id === entityId) {
        // 3. Оновлюємо стан компонента. React зробить ре-рендер.
        setEntity(updatedEntity);
      }
    };

    // 4. Підписуємось на подію 'entity:update' на глобальній шині подій.
    eventBus.on('entity:update', handleUpdate);

    // 5. Дуже важливо! Прибираємо слухача, коли компонент розмонтовується,
    // щоб уникнути витоків пам'яті.
    return () => {
      eventBus.off('entity:update', handleUpdate);
    };
  }, [entityId]); // Ефект буде перезапускатись, тільки якщо зміниться entityId.

  // 6. Повертаємо поточний стан сутності.
  return entity;
};

export default useEntity;