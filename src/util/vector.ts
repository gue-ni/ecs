/**
 * 
 */
class Vector {
	x: number;
	y: number;

	constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}

	static min(v1: Vector, v2: Vector){
		return new Vector(Math.min(v1.x, v2.x), Math.min(v1.y, v2.y))
	}

	static max(v1: Vector, v2: Vector){
		return new Vector(Math.max(v1.x, v2.x), Math.max(v1.y, v2.y))
	}

	set(x: number, y: number){
		this.x = x;
		this.y = y;
	}

	scalarMult(scalar: number): Vector {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}

	plus(vector: Vector): Vector {
		return new Vector(this.x + vector.x, this.y + vector.y);
	}

	minus(vector: Vector): Vector {
		return new Vector(this.x - vector.x, this.y - vector.y);
	}

	divide(vector: Vector): Vector {
		return new Vector(this.x / vector.x, this.y / vector.y);
	}

  times(vector: Vector): Vector {
    return new Vector(this.x * vector.x, this.y * vector.y);
  }

	magnitude(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	copy(): Vector {
		return new Vector(this.x, this.y);
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


export {Vector}