import { Component, ComponentConstructor, ComponentType, getComponentType } from "./component";

let _entities = 0;

type EntityID = string;

class Entity {
	readonly id: EntityID;
	readonly entityNumber: number;
	active: boolean;
	ttl?: number;
	readonly components = new Map<ComponentType, Component>();

	constructor(params?: { id?: string; ttl?: number }) {
		this.active = true;
		this.ttl = params?.ttl;
		this.entityNumber = _entities++;
		this.id = params?.id || (+new Date()).toString(16) + this.entityNumber;
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

	/*
	getComponent<T extends Component>(component: ComponentConstructor): T | undefined {
		return this.components.get(component.type) as T;
	}
	*/

	getComponent(component: ComponentConstructor): Component {
		return this.components.get(component.type)!;
	}

	_destroy() {
		for (let [_, component] of this.components) {
			component.destroy();
		}
	}
}

export { Entity, EntityID };
