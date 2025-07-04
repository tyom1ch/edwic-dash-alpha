// src/hooks/useEntity.js
import { useState, useEffect, useCallback } from 'react';
import deviceRegistry from '../core/DeviceRegistry'; // Наш глобальний реєстр станів
import eventBus from '../core/EventBus'; // Шина подій для комунікації

/**
 * Хук для отримання та відстеження стану однієї сутності (віджета).
 * 
 * Цей хук з'єднує React-компонент з глобальним `deviceRegistry`.
 * Він забезпечує компонент найсвіжішим станом сутності при монтажі
 * та автоматично оновлює його при надходженні нових даних.
 * 
 * @param {string} entityId - Унікальний ID сутності, за якою потрібно стежити.
 * @returns {object | null} - Об'єкт стану сутності або null, якщо її ще не існує.
 */
const useEntity = (entityId) => {
  /**
   * Функція для отримання початкового стану сутності.
   * Вона викликається лише один раз при першому рендері компонента завдяки
   * механізму "lazy initial state" в `useState`.
   * 
   * Це вирішує проблему "застарілого стану": коли компонент монтується,
   * він одразу бере найсвіжіші дані з `deviceRegistry`, який працював у фоні.
   */
  const getInitialState = () => {
    const initialState = deviceRegistry.getEntity(entityId);
    // console.log(`[useEntity] Getting initial state for ${entityId}:`, initialState);
    return initialState || null; // Повертаємо null, якщо сутності ще немає
  };
  
  // Ініціалізуємо стан компонента, викликавши getInitialState один раз.
  const [entity, setEntity] = useState(getInitialState);

  /**
   * Обробник оновлень, що надходять з EventBus.
   * Використовуємо `useCallback`, щоб ця функція не створювалася заново на кожному рендері,
   * що запобігає зайвим пере-підпискам в `useEffect`.
   * Функція залежить тільки від `entityId`, тому вона буде стабільною протягом життя компонента.
   */
  const handleUpdate = useCallback((updatedEntity) => {
    // Перевіряємо, чи оновлення стосується саме тієї сутності, яку відстежує цей хук.
    // Використовуємо String() для надійного порівняння ID.
    if (updatedEntity && String(updatedEntity.id) === String(entityId)) {
      // console.log(`[useEntity] Matched and updating component for entityId: ${entityId}`);
      // Оновлюємо локальний стан компонента, що викликає його перерендер.
      setEntity(updatedEntity);
    }
  }, [entityId]); // Залежність тільки від entityId

  /**
   * Ефект, який керує життєвим циклом підписки на події.
   */
  useEffect(() => {
    // --- ВАЖЛИВА ПЕРЕВІРКА (додаткова страховка) ---
    // Може існувати дуже малий проміжок часу між початковим рендером і запуском цього ефекту.
    // На випадок, якщо стан в реєстрі оновився саме в цей момент, ми робимо фінальну перевірку.
    const currentState = deviceRegistry.getEntity(entityId);
    
    // Порівнюємо поточний стан в компоненті зі станом в реєстрі.
    // JSON.stringify - простий спосіб глибокого порівняння об'єктів.
    if (JSON.stringify(currentState) !== JSON.stringify(entity)) {
      setEntity(currentState);
    }
    
    // Підписуємось на майбутні оновлення сутностей.
    eventBus.on('entity:update', handleUpdate);

    // Функція очищення, яка викликається при розмонтуванні компонента.
    // Вона прибирає слухача, щоб уникнути витоків пам'яті.
    return () => {
      eventBus.off('entity:update', handleUpdate);
    };
  }, [entityId, handleUpdate, entity]); // Залежності ефекту

  // Повертаємо об'єкт сутності, щоб компонент міг його використовувати для рендерингу.
  return entity;
};

export default useEntity;