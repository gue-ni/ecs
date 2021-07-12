class System {
	constructor(requiredComponents) {
		this.requiredComponents = requiredComponents;
	}

	get name() {
		return this.constructor.name;
	}

	destroy() {}

	componentMatch(entity) {
		// TODO check if components math required components
		return true;
	}

	updateEntity(entity, dt, params) {
		console.log("default logic");
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
