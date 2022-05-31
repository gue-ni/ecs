// https://github.com/jakeklassen/ecs

const MAX_COMPONENTS = 35;
let _component_types = 0;
let _component_signatures = 0;

// TODO should be bitmask
type Signature = number;

interface IComponent {
	readonly signature: Signature;
}

type Constructor<T> = abstract new (...args: any[]) => T;

type ComponentConstructor = Constructor<Component> & IComponent;

abstract class Component {
	protected static _signature: Signature;

	/*
	public static get type(): ComponentType {
		if (this._type == null) {
			this._type = _component_types++;
		}
		return this._type;
	}
	*/

	public static get signature() {
		if (this._signature == null) {
			this._signature = 0b1 << _component_signatures++;
		}
		return this._signature;
	}

	destroy() {}
}
/*

function getComponentType(component: Component): ComponentType {
	return (component.constructor as ComponentConstructor).type;
}
*/

function getComponentSignature(component: Component): Signature {
	return (component.constructor as ComponentConstructor).signature;
}

export { Component, IComponent, ComponentConstructor, Signature, getComponentSignature };
