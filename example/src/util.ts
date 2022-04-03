export function randomInteger(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

export function normalize(val: number, min: number, max: number) {
	return (val - min) / (max - min);
}

function normalizeToRange(val: number, minVal: number, maxVal: number, newMin: number, newMax: number) {
	return newMin + ((val - minVal) * (newMax - newMin)) / (maxVal - minVal);
}

export class Vector {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	scalarMult(scalar: number): Vector {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}

	add(vector: Vector): Vector {
		return new Vector(this.x + vector.x, this.y + vector.y);
	}

	sub(vector: Vector): Vector {
		return new Vector(this.x - vector.x, this.y - vector.y);
	}

	magnitude(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	round(): Vector {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	}

	floor(): Vector {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	}

	random(): Vector {
		this.x = Math.random();
		this.y = Math.random();
		return this;
	}

	normalize(): Vector {
		const mag = this.magnitude();
		this.x /= mag;
		this.y /= mag;
		return this;
	}
}
