import { Entity } from "./entity";
import { System } from "./system";

class ECS {
	systems: System[];
	entities: Entity[];
	_entitiesToAdd: Entity[];
	_entitiesToRemove: Set<Entity>;

	constructor() {
		this.entities = [];
		this.systems = [];
		this._entitiesToAdd = [];
		this._entitiesToRemove = new Set();
	}

	_addQueuedEntities(): void {
		if (this._entitiesToAdd.length) {
			this.entities.splice(this.entities.length, 0, ...this._entitiesToAdd);
			this._entitiesToAdd = [];
		}
	}

	_removeQueuedEntities(): void {
		if (this._entitiesToRemove.size) {
			this.entities = this.entities.filter((entity) => !this._entitiesToRemove.has(entity));
			this._entitiesToRemove.clear();
		}
	}

	addEntity(entity: Entity): Entity {
		this._entitiesToAdd.push(entity);
		return entity;
	}

	removeEntity(entity: Entity): void {
		entity.destroy();
		this._entitiesToRemove.add(entity);
	}

	addSystem(system: System): System {
		system.ecs = this;
		this.systems.push(system);
		return system;
	}

	removeSystem(system: System): void {
		system.destroy();
		this.systems = this.systems.filter((s) => s != system);
	}

	_matching(entity: Entity, system: System) {
		return system.componentMatch(entity) && entity.active;
	}

	update(params: any): void {
		this._addQueuedEntities();
		this._removeQueuedEntities();

		for (const system of this.systems) {
			/*
			function func(entity: Entity) {
				return system.componentMatch(entity) && entity.active;
			}
			*/

			let entities = this.entities.filter((entity) => this._matching(entity, system));
			system.updateSystem(entities, params);
		}

		this._removeQueuedEntities();
	}
}

export { ECS };
