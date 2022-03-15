import { Component } from "./component";

let _entities = 0;

class Entity {
	id: string;
	active: boolean;
	ttl?: number;
	components: Map<string, Component>;

	constructor(ttl?: number) {
		this.active = true;
		this.components = new Map<string, Component>();
		this.id = (+new Date()).toString(16) + _entities++;
		this.ttl = ttl;
	}

	addComponent(component: Component): Entity {
		component.entity = this;
		this.components.set(component.name, component);
		return this;
	}

	removeComponent(component: any): void {
		const removed = this.components.get(component.name);
		if (removed) {
			removed.destroy();
			this.components.delete(component.name);
		}
	}

	getComponent(component: any): Component {
		// https://stackoverflow.com/questions/66159907/getting-error-type-typeof-b-is-not-assignable-to-type-typeof-a-for-class-b
		return this.components.get(component.name)!;
	}

	_destroy(): void {
		for (let [_, component] of this.components) {
			component.destroy();
		}
	}
}

export { Entity };
