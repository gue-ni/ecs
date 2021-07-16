import { ECS } from "./ecs";
import { Entity } from "./entity";
import { Component } from "./component";

class System {
	requiredComponents: Component[];

	ecs?: ECS;

	constructor(requiredComponents: Component[]) {
		this.requiredComponents = requiredComponents;

		if (this.constructor == System) throw new Error("System is a abstract class!");

		if (!this.requiredComponents) throw new Error("A System must operate on some components!");
	}

	get name(): string {
		return this.constructor.name;
	}

	destroy() {}

	componentMatch(entity: Entity): boolean {
		for (let component of this.requiredComponents) {
			if (!entity.components[component.name]) return false;
		}
		return true;
	}

	updateEntity(entity: Entity, dt: number, params: any): void {}

	updateSystem(entities: Entity[], dt: number, params: any): void {
		for (let entity of entities) {
			this.updateEntity(entity, dt, params);
		}
	}
}

export { System };
