import { Entity } from "./entity";

class Component {

	entity: Entity;

	constructor(entity: Entity) {
		if (!entity) throw new Error("Entity is null");
		this.entity = entity;
	}

	get name() {
		return this.constructor.name;
	}

	destroy() {}
}

export { Component };
