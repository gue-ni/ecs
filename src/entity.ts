import { Component } from "./component";

let _entities = 0;

class Entity {
	id: String;
	active: boolean;
	ttl?: number;
	components: Map<String, Component>;

	constructor(ttl?: number) {
		this.active = true;
		this.components = new Map<String, Component>();
		this.id = (+new Date()).toString(16) + _entities++;
		this.ttl = ttl;
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

	getComponent(component: any): Component {
		// https://stackoverflow.com/questions/66159907/getting-error-type-typeof-b-is-not-assignable-to-type-typeof-a-for-class-b
		return this.components.get(component.name)!;
	}

	getComponents(components: any): Component[] {
		let arr: Component[] = [];
		for (let component of components){
			arr.push(this.getComponent(component))
		}
		return arr;
	}

	/*
	getComponents(components: Component[]): Component[] | {
	}
	*/

	_destroy(): void {
		for (let [name, component] of this.components) {
			component.destroy();
		}
	}
}

export { Entity };
