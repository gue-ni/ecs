class System {
	constructor(requiredComponents) {
		this.requiredComponents = requiredComponents;

		if (!this.requiredComponents) {
			throw new Error("A System must operate on some components!");
		}

		if (this.constructor == System) {
			throw new Error("Abstract classes can't be instantiated!");
		}
	}

	get name() {
		return this.constructor.name;
	}

	destroy() {}

	// check if components math required components
	componentMatch(entity) {
		for (let component of this.requiredComponents) {
			if (!entity.components[component.name]) return false;
		}
		return true;
	}

	updateEntity(entity, dt, params) {
		throw new Error("updateEntity() must be implemented");
	}

	updateSystem(ecs, dt, params) {
		for (const entity of ecs.entities) {
			if (!ecs.entitiesToRemove.has(entity) && this.componentMatch(entity)) {
				this.updateEntity(entity, dt, params);
			}
		}
	}
}

export { System };
