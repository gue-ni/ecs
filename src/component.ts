import { Entity } from "./entity";

class Component {
	entity: Entity | undefined;

	get name(): string {
		return this.constructor.name;
	}

	destroy() {}
}

export { Component };
