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

	_addQueuedEntities(): void {
		if (this.entitiesToAdd.length) {
			this.entities.splice(this.entities.length, 0, ...this.entitiesToAdd);
			this.entitiesToAdd = [];
		}
	}

	_removeQueuedEntities(): void {
		if (this.entitiesToRemove.size) {
			this.entities = this.entities.filter((entity) => !this.entitiesToRemove.has(entity));
			this.entitiesToRemove.clear();
		}
	}

	addEntity(entity: Entity): Entity {
		this.entitiesToAdd.push(entity);
		return entity;
	}

	removeEntity(entity: Entity): void {
		entity.destroy();
		this.entitiesToRemove.add(entity);
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

	update(dt: number, params: any): void {
		this._addQueuedEntities();
		this._removeQueuedEntities();

		for (const system of this.systems) {
			function func(entity: Entity) {
				return system.componentMatch(entity) && entity.active;
			}

			let entities = this.entities.filter(func);
			system.updateSystem(entities, dt, params);
		}

		this._removeQueuedEntities();
	}
}

export { ECS };
