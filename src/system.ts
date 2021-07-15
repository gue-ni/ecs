import { Component } from "./component";
import { ECS } from "./ecs";
import { Entity } from "./entity";

class System {

	requiredComponents: Component[];

	constructor(requiredComponents: Component[]) {
		this.requiredComponents = requiredComponents;

		if (this.constructor == System) throw new Error("System is a abstract class!");
		if (!this.requiredComponents) throw new Error("A System must operate on some components!");
	}

	get name() {
		return this.constructor.name;
	}

	destroy() {}

	componentMatch(entity: Entity) {
		for (let component of this.requiredComponents) {
			if (!entity.components[component.name]) return false;
		}
		return true;
	}

	updateEntity(entity: Entity, dt: number, params: any) {
		throw new Error("updateEntity(entity, dt, params) must be implemented");
	}

	updateSystem(entities: Entity[], dt: number, params: any) {
		for (let entity of entities) {
			this.updateEntity(entity, dt, params);
		}
	}
}

export { System };
