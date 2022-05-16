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
	name: string = "spike";
}

export enum CollectibleType {
	DASH,
}

export class Collectible extends ECS.Component {
	t: CollectibleType = CollectibleType.DASH;
}

export class Controller extends ECS.Component {
	allowed_jumps: number = 2;
	dashing: boolean = false;
	jumping: boolean = false;
	allowed_dashes: number = 1;
	dash_allowed: boolean = true;
	goal: ECS.Vector = new ECS.Vector(0, 0);
	current: ECS.Vector = new ECS.Vector();
}

export class ParticleEmitter extends ECS.Component {
	dash: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.2,
		maxTTL: 0.5,
		minSize: 1,
		maxSize: 2,
		gravity: -100,
		emitterRadius: 4,
		maxCount: 500,
		particlesPerSecond: 100,
		speed: 0,
	});

	jump: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.1,
		maxTTL: 0.4,
		minSize: 1,
		maxSize: 2,
		gravity: -100,
		maxCount: 50,
		particlesPerSecond: 150,
		speed: 0,
	});

	explosion: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.1,
		maxTTL: 0.2,
		minSize: 1,
		maxSize: 4,
		gravity: -200,
		emitterRadius: 4,
		maxCount: 10,
		particlesPerSecond: 1000,
		speed: 100,
		active: false,
		finiteParticles: true,
	});
}
