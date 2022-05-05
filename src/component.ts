// https://github.com/jakeklassen/ecs

let component_id = 0;

interface IComponent {
	readonly type: number;
}

type Constructor<T> = abstract new (...args: any[]) => T;

type ComponentConstructor = Constructor<Component> & IComponent;

abstract class Component {
	protected static _type: number;

	public static get type(): number {
		if (this._type == null) {
			this._type = component_id++;
		}
		return this._type;
	}

	destroy() {}
}

function getComponentType(component: Component): number {
	return (component.constructor as ComponentConstructor).type;
}

export { Component, IComponent, ComponentConstructor, getComponentType };
