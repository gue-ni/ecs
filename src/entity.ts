import { Component, ComponentConstructor } from "./component";

let _entities = 0;

interface EntityParams {
	id?: string;
	ttl?: number;
}

type EntityID = string;

class Entity {
	id: EntityID;
	active: boolean;
	ttl?: number;
	components: Map<number, Component>;

	constructor(params?: EntityParams) {
		params = params || {};
		this.active = true;
		this.components = new Map<number, Component>();
		this.id = params.id || (+new Date()).toString(16) + _entities++;
		this.ttl = params.ttl;
	}

	addComponent(component: Component): Entity {
		this.components.set((component.constructor as ComponentConstructor).type, component);
		return this;
	}

	removeComponent(component: ComponentConstructor): void {
		const removed = this.components.get(component.type);
		if (removed) {
			removed.destroy();
			this.components.delete(component.type);
		}
	}

	getComponent(component: ComponentConstructor): Component | undefined {
		return this.components.get(component.type);
	}

	_destroy(): void {
		for (let [_, component] of this.components) {
			component.destroy();
		}
	}
}

export { Entity, EntityID };
