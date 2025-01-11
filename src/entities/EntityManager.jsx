// EntityManager: для управління сутностями
class EntityManager {
  constructor() {
    this.entities = {};
  }

  registerEntity(name, entity) {
    this.entities[name] = entity;
  }

  getEntity(name) {
    return this.entities[name];
  }

  updateEntity(name, data) {
    if (this.entities[name]) {
      this.entities[name].update(data);
    }
  }
}

export default new EntityManager();
