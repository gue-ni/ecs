import * as THREE from "three";

let _entities = 0;

class Entity {
	constructor(parent) {
		this.active = true;
		this.components = {};
		this.id = (+new Date()).toString(16) + _entities++;
		this.transform = new THREE.Object3D();
		if (parent) parent.add(this.transform);
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
