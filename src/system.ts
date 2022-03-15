import { ECS, UpdateParams } from "./ecs";
import { Entity } from "./entity";
import { Component } from "./component";

type entityCallback = (entities: Entity[], params?: UpdateParams) => Entity[];

abstract class System {
	private requiredComponents: any[];

	private updateFrequency: number;
	private timeSinceLastUpdate: number = 0;

	ecs?: ECS;
	beforeUpdate: entityCallback | null = null;
	afterUpdate: entityCallback | null = null;

	constructor(requiredComponents: any[], updatesPerSecond: number = 100) {
		this.requiredComponents = requiredComponents;
		this.updateFrequency = 1 / updatesPerSecond;
		if (!this.requiredComponents || this.requiredComponents.length === 0)
			throw new Error("A System must operate on some components!");
	}

	get name(): string {
		return this.constructor.name;
	}

	_componentMatch(entity: Entity): boolean {
		for (let component of this.requiredComponents) {
			if (!entity.components.has(component.name)) return false;
		}
		return true;
	}

	abstract updateEntity(entity: Entity, params: UpdateParams): void;

	updateSystem(entities: Entity[], params: UpdateParams): void {
		this.timeSinceLastUpdate += params.dt;
		if (this.timeSinceLastUpdate > this.updateFrequency) {
			this.timeSinceLastUpdate = 0;

			if (this.beforeUpdate) {
				entities = this.beforeUpdate(entities, params);
			}
			for (let entity of entities) {
				this.updateEntity(entity, params);
			}
			if (this.afterUpdate) {
				entities = this.afterUpdate(entities, params);
			}
		}
	}
}

export { System };
