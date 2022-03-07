import { ECS, UpdateParams } from "./ecs";
import { Entity } from "./entity";
import { Component } from "./component";

type entityCallback = (entities: Entity[], params?: UpdateParams) => Entity[];

class System {
	private requiredComponents: any[];

	ecs?: ECS;
	beforeUpdate: entityCallback | null = null;
	afterUpdate: entityCallback | null = null;

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
		// TODO: implement your logic here
	}

	

	updateSystem(entities: Entity[], params: UpdateParams): void {
		if (this.beforeUpdate){
			entities = this.beforeUpdate(entities, params)
		}
		for (let entity of entities) {
			this.updateEntity(entity, params);
		}
		if (this.afterUpdate){
			entities = this.afterUpdate(entities, params);
		}
	}
}

export { System };
