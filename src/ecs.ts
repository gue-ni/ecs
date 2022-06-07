import { Entity, EntityID } from "./entity";
import { System } from "./system";
import { seconds } from "./util";

interface UpdateParams {
	dt: seconds;
	now?: seconds;
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	ecs?: ECS;
	[key: string]: unknown; // accept any kind of further object
}

class ECS {
	systems: System[];
	entities: Entity[];
	private _entitiesToAdd: Entity[];
	private _entitiesToRemove: Set<Entity>;

	constructor() {
		this.entities = [];
		this.systems = [];
		this._entitiesToAdd = [];
		this._entitiesToRemove = new Set();
	}

	private _addQueuedEntities(): void {
		if (this._entitiesToAdd.length) {
			this.entities.splice(this.entities.length, 0, ...this._entitiesToAdd);
			this._entitiesToAdd = [];
		}
	}

	private _removeQueuedEntities(): void {
		if (this._entitiesToRemove.size) {
			this.entities = this.entities.filter((entity) => !this._entitiesToRemove.has(entity));
			this._entitiesToRemove.clear();
		}
	}

	addEntity(entity: Entity): Entity {
		this._entitiesToAdd.push(entity);
		return entity;
	}

	clearEntities(): void {
		for (let entity of this.entities) {
			entity._destroy();
		}
		this.entities = [];
	}

	clearSystems(): void {
		this.systems = [];
	}

	removeEntity(entity: Entity): void {
		entity._destroy();
		this._entitiesToRemove.add(entity);
	}

	addSystem(system: System): System {
		system.ecs = this;
		this.systems.push(system);
		return system;
	}

	removeSystem(system: System): void {
		this.systems = this.systems.filter((s) => s != system);
	}

	update(params: UpdateParams): void {
		this._addQueuedEntities();
		this._removeQueuedEntities();

		for (const entity of this.entities) {
			if (entity.ttl) {
				entity.ttl -= params.dt;
				if (entity.ttl <= 0) this.removeEntity(entity);
			}
		}

		for (const system of this.systems) {
			let entities = this.entities.filter((entity) => system.signature == (entity.signature & system.signature));
			system.updateSystem(entities, params);
		}

		this._removeQueuedEntities();
	}
}

export { ECS, UpdateParams };
