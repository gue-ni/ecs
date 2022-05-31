import { ECS, UpdateParams } from "./ecs";
import { Entity } from "./entity";
import { ComponentConstructor } from "./component";

abstract class System {
	private requiredComponents: ComponentConstructor[];

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
		// TODO improve this
		for (let required of this.requiredComponents) {
			if (!entity.components.has(required.type)) return false;
		}
		return true;
	}

	abstract updateEntity(entity: Entity, params: UpdateParams): void;

	beforeAll(entities: Entity[], params: UpdateParams) {}

	afterAll(entities: Entity[], params: UpdateParams) {}

	updateSystem(entities: Entity[], params: UpdateParams): void {
		if (entities.length) {
			this.beforeAll(entities, params);

			for (let entity of entities) {
				this.updateEntity(entity, params);
			}

			this.afterAll(entities, params);
		}
	}
}

export { System };
