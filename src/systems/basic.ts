import { Component } from "../component";

class VectorComponent extends Component {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Velocity extends VectorComponent {}

class Position extends VectorComponent {}

export { Position, Velocity };
