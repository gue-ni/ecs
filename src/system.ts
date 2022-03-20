import { ECS, UpdateParams } from "./ecs";
import { Entity } from "./entity";

type Operator = "and" | "or";
type entityCallback = (entities: Entity[], params?: UpdateParams) => Entity[];

interface SystemParams {
	updatesPerSecond?: number;
	operator?: Operator;
}

abstract class System {
	private requiredComponents: any[];

	private updateFrequency: number;
	private timeSinceLastUpdate: number = 0;

	ecs?: ECS;
	operator: Operator;
	beforeUpdate: entityCallback | null = null;
	afterUpdate: entityCallback | null = null;

	constructor(requiredComponents: any[], params?: SystemParams) {
		this.requiredComponents = requiredComponents;
		if (!this.requiredComponents || this.requiredComponents.length === 0)
			throw new Error("A System must operate on some components!");

		params = params || {}
		this.updateFrequency = 1 / (params.updatesPerSecond || 100);
		this.operator = params.operator || "and";
		}

	get name(): string {
		return this.constructor.name;
	}

	_componentMatch(entity: Entity): boolean {
		if (this.operator === "and"){
			for (let component of this.requiredComponents) {
				if (!entity.components.has(component.name)) return false;
			}
			return true;
		} else if (this.operator === "or"){
			for (let component of this.requiredComponents) {
				if (entity.components.has(component.name)) return true;
			}
			return true;
		} else {
			throw new Error("bla bla bal")
		}
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
