import { ECS, UpdateParams } from "./ecs";
import { Entity } from "./entity";



abstract class System {
	private requiredComponents: any[];

	ecs?: ECS;

	constructor(requiredComponents: any[]) {
		this.requiredComponents = requiredComponents;
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

	beforeAll(entities: Entity[], params: UpdateParams) {}

	afterAll(entities: Entity[], params: UpdateParams) {}

	updateSystem(entities: Entity[], params: UpdateParams): void {
		this.beforeAll(entities, params);

		for (let entity of entities) {
			this.updateEntity(entity, params);
		}

		this.afterAll(entities, params);
	}
}

export { System };
