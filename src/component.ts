// https://github.com/jakeklassen/ecs

let _component_types = 0;

type ComponentType = number;

interface IComponent {
	readonly type: ComponentType;
}

type Constructor<T> = abstract new (...args: any[]) => T;

type ComponentConstructor = Constructor<Component> & IComponent;

abstract class Component {
	protected static _type: ComponentType;

	public static get type(): ComponentType {
		if (this._type == null) {
			this._type = _component_types++;
		}
		return this._type;
	}

	destroy() {}
}

function getComponentType(component: Component): ComponentType {
	return (component.constructor as ComponentConstructor).type;
}

export { Component, IComponent, ComponentConstructor, ComponentType, getComponentType };
