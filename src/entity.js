let _entities = 0;

class Entity {
	constructor() {
		this.id = (+new Date()).toString(16) + _entities;
		_entities++;
		this.components = {};
	}

	addComponent(component) {
		this.components[component.name] = component;
		return component;
	}

	removeComponent(component) {
		const comp = this.components[component.name];
		if (comp) {
			comp.destroy();
			delete this.components[component.name];
		}
	}

	getComponent(component) {
		return this.components[component.name];
	}

	destroy() {
		for (let component of this.components) {
			component.destroy();
		}
	}
}

export { Entity };
