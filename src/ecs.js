class ECS {
	constructor() {
		this.entities = [];
		this.systems = [];
		this.entitiesToAdd = [];
		this.entitiesToRemove = new Set();
	}

	_addQueuedEntities() {
		if (this.entitiesToAdd.length) {
			this.entities.splice(this.entities.length, 0, ...this.entitiesToAdd);
			this.entitiesToAdd = [];
		}
	}

	_removeQueuedEntities() {
		if (this.entitiesToRemove.size) {
			this.entities = this.entities.filter((entity) => !this.entitiesToRemove.has(entity));
			this.entitiesToRemove.clear();
		}
	}

	addEntity(entity) {
		this.entitiesToAdd.push(entity);
		return entity;
	}

	removeEntity(entity) {
		entity.destroy();
		this.entitiesToRemove.add(entity);
	}

	addSystem(system) {
		this.systems.push(system);
		return system;
	}

	removeSystem(system) {
		system.destroy();
		this.systems = this.systems.filter((s) => s != system);
	}

	update(dt, params) {
		this._addQueuedEntities();
		this._removeQueuedEntities();

		for (const system of this.systems) {
			system.updateSystem(this, dt, params);
		}

		this._removeQueuedEntities();
	}
}

export { ECS };
