import { ECS, UpdateParams } from "./ecs";
import { Entity } from "./entity";
import { Component } from "./component";

class System {
	requiredComponents: any[];

	ecs?: ECS;

	constructor(requiredComponents: any[]) {
		this.requiredComponents = requiredComponents;

		if (this.constructor == System) throw new Error("System is a abstract class!");

		if (!this.requiredComponents) throw new Error("A System must operate on some components!");
	}

	get name(): string {
		return this.constructor.name;
	}

	destroy() {
		// TODO: can also be overidden
	}

	_componentMatch(entity: Entity): boolean {
		for (let component of this.requiredComponents) {
			if (!entity.components.has(component.name)) return false;
		}
		return true;
	}

	updateEntity(entity: Entity, params: UpdateParams): void {
		// TODO: override this
	}

	_updateSystem(entities: Entity[], params: UpdateParams): void {
		for (let entity of entities) {
			this.updateEntity(entity, params);
		}
	}
}

export { System };
