import { Entity } from "./entity";
import { System } from "./system";

class ECS {

	systems: System[];
	entities: Entity[];
	entitiesToAdd: Entity[];
	entitiesToRemove: Set<Entity>;

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

	addEntity(entity: Entity) {
		this.entitiesToAdd.push(entity);
		return entity;
	}

	removeEntity(entity: Entity) {
		entity.destroy();
		this.entitiesToRemove.add(entity);
	}

	addSystem(system: System) {
		this.systems.push(system);
		return system;
	}

	removeSystem(system: System) {
		system.destroy();
		this.systems = this.systems.filter((s) => s != system);
	}

	update(dt: number, params: any) {
		this._addQueuedEntities();
		this._removeQueuedEntities();

		for (const system of this.systems) {

			function func(entity: Entity){
				return system.componentMatch(entity) && entity.active;
			}

			let entities = this.entities.filter(func);
			system.updateSystem(entities, dt, params);
		}

		this._removeQueuedEntities();
	}
}

export { ECS };
