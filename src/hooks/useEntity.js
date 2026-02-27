import { useCallback, useSyncExternalStore } from 'react';
import deviceRegistry from '../core/DeviceRegistry';
import eventBus from '../core/EventBus';

const useEntity = (entityId) => {
  const subscribe = useCallback((callback) => {
    eventBus.on(`entity:update:${entityId}`, callback);
    return () => {
      eventBus.off(`entity:update:${entityId}`, callback);
    };
  }, [entityId]);

  const getSnapshot = useCallback(() => {
    return deviceRegistry.getEntity(entityId) || null;
  }, [entityId]);

  return useSyncExternalStore(subscribe, getSnapshot);
};

export default useEntity;