import { Component } from "../component";

class Position extends Component {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Velocity extends Component {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}
}

export { Position, Velocity };
