import { Component, ComponentConstructor, Signature, getComponentSignature } from "./component";

let _entities = 0;

type EntityID = string;

class Entity {
	readonly id: EntityID;
	readonly entityNumber: number;
	active: boolean;
	ttl?: number;
	signature: number = 0;
	readonly components = new Map<Signature, Component>();

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
		const signature = getComponentSignature(component);
		this.signature |= signature;
		this.components.set(signature, component);
		return this;
	}

	removeComponent(component: ComponentConstructor) {
		const removed = this.components.get(component.signature);
		if (removed) {
			removed.destroy();
			this.signature ^= component.signature;
			this.components.delete(component.signature);
		}
	}

	/*
	getComponent(component: ComponentConstructor): Component {
		return this.components.get(component.signature)!;
	}
	*/

	getComponent<T extends Component>(component: ComponentConstructor): T {
		return this.components.get(component.signature) as T;
	}

	_destroy() {
		for (let [_, component] of this.components) {
			component.destroy();
		}
	}
}

export { Entity, EntityID };
