import { useState, useEffect } from 'react';
import deviceRegistry from '../core/DeviceRegistry';
import eventBus from '../core/EventBus';

const useEntity = (entityId) => {
const [entity, setEntity] = useState(() => deviceRegistry.getEntity(entityId) || null);

useEffect(() => {
const currentState = deviceRegistry.getEntity(entityId) || null;
setEntity(currentState);

const handleUpdate = (updatedEntity) => {
  setEntity(updatedEntity);
};

eventBus.on(`entity:update:${entityId}`, handleUpdate);

return () => {
  eventBus.off(`entity:update:${entityId}`, handleUpdate);
};
}, [entityId]);

return entity;
};

export default useEntity;