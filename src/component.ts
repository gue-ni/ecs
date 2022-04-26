import { Entity } from "./entity";

abstract class Component {
	entity: Entity | undefined;

	get name(): string {
		// https://www.beyondjava.net/constructor-name
		return this.constructor.name;
	}

	destroy() {}
}

export { Component };
