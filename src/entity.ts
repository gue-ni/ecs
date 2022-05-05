import { Component, ComponentConstructor, ComponentType, getComponentType } from "./component";

let _entities = 0;

interface EntityParams {
	id?: string;
	ttl?: number;
}

type EntityID = string;

class Entity {
	readonly id: EntityID;
	active: boolean;
	ttl?: number;
	readonly components = new Map<ComponentType, Component>();

	constructor(params: EntityParams = {}) {
		this.active = true;
		this.id = params.id || (+new Date()).toString(16) + _entities++;
		this.ttl = params.ttl;
	}

	addComponents(...components: Component[]): Entity {
		for (let component of components) {
			this.addComponent(component);
		}
		return this;
	}

	addComponent(component: Component): Entity {
		this.components.set(getComponentType(component), component);
		return this;
	}

	removeComponent(component: ComponentConstructor) {
		const removed = this.components.get(component.type);
		if (removed) {
			removed.destroy();
			this.components.delete(component.type);
		}
	}

	getComponent<T extends Component>(component: ComponentConstructor): T | undefined {
		return this.components.get(component.type) as T;
	}

	_destroy() {
		for (let [_, component] of this.components) {
			component.destroy();
		}
	}
}

export { Entity, EntityID };
