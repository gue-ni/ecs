import * as THREE from "three";
import { Component } from "./component";

let _entities = 0;

class Entity {
	id: String;
	active: boolean;
	components: any;
	transform: THREE.Object3D;

	constructor(parent: THREE.Object3D) {
		this.active = true;
		this.components = {};
		this.id = (+new Date()).toString(16) + _entities++;
		this.transform = new THREE.Object3D();
		if (parent) parent.add(this.transform);
	}

	get root() {
		let tmp = this.transform.parent;
		while (tmp?.parent != null) {
			tmp = tmp.parent;
		}
		return tmp;
	}

	get position(): THREE.Vector3 {
		return this.transform.position;
	}

	set position(p: THREE.Vector3) {
		this.transform.position.copy(p);
	}

	get rotation() {
		return this.transform.rotation;
	}

	set rotation(r: THREE.Euler) {
		this.transform.rotation.copy(r);
	}

	get worldQuaternion(): THREE.Quaternion {
		return this.transform.getWorldQuaternion(new THREE.Quaternion());
	}

	get worldPosition() {
		return this.transform.getWorldPosition(new THREE.Vector3());
	}

	addComponent(component: Component): Component {
		this.components[component.name] = component;
		return component;
	}

	removeComponent(component: Component) {
		const comp = this.components[component.name];
		if (comp) {
			comp.destroy();
			delete this.components[component.name];
		}
	}

	getComponent(component: Component): Component {
		return this.components[component.name];
	}

	destroy() {
		for (let component of this.components) {
			component.destroy();
		}
	}
}

export { Entity };
