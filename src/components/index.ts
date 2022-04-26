import { Component } from "../component";

class Position extends Component {
	_x: number;
	_y: number;

	constructor(x: number, y: number) {
		super();
		this._x = x;
		this._y = y;
	}

	get x() {
		return Math.round(this._x);
	}

	get y() {
		return Math.round(this._y);
	}

	set x(v) {
		this._x = v;
	}

	set y(v) {
		this._y = v;
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
