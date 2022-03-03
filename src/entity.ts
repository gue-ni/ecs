import { Component } from "./component";

let _entities = 0;

class Entity {
	id: String;
	active: boolean;
	components: Map<String, Component>;

	constructor() {
		this.active = true;
		this.components = new Map<String, Component>();
		this.id = (+new Date()).toString(16) + _entities++;
	}

	addComponent(component: Component): Component {
		component.entity = this;
		this.components.set(component.name, component);
		return component;
	}

	removeComponent(component: Component): void {
		const removed = this.components.get(component.name);
		if (removed) {
			removed.destroy();
			this.components.delete(component.name);
		}
	}

	getComponent(component: Component): Component | null {
		return this.components.get(component.name) || null;
	}

	destroy(): void {
		for (let [name, component] of this.components) {
			component.destroy();
		}
	}
}

export { Entity };
