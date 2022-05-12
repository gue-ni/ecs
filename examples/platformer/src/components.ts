
import * as ECS from "../../../src";

export class Forces extends ECS.VectorComponent {

		mass: number = 10;
}

export class Sprite extends ECS.Component {
	w: number;
	h: number;
	color: string;
	visible: boolean = true;

	constructor(w: number, h: number, color: string) {
		super();
		this.w = w;
		this.h = h;
		this.color = color;
	}
}

export class Respawn extends ECS.VectorComponent {
	waiting: boolean = false;
}

export class Tile extends ECS.Component {}

export class Health extends ECS.Component {
	value: number = 100;
}

export class Acceleration extends ECS.VectorComponent {}

export class Gravity extends ECS.Component {}

export class Bouncy extends ECS.Component {}

export class Spike extends ECS.Component {
  name: string = "spike"
}

export enum CollectibleType {
	DASH,
}

export class Collectible extends ECS.Component {
	t: CollectibleType = CollectibleType.DASH;
}

export class Controller extends ECS.Component {
	block_special: boolean = false;
	allowed_jumps: number = 2;
	interpolate: number = 0;
	dashing: boolean = false;
	allowed_dashes: number = 1;
	dash_allowed: boolean = true;
	goal: ECS.Vector = new ECS.Vector(0, 0);
	current: ECS.Vector = new ECS.Vector();
}

