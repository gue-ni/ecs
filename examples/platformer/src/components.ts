import * as ECS from "../../../src";

export class Forces extends ECS.VectorComponent {
	mass: number = 10;
}

class Animation {
	repeat: boolean;
	frame: ECS.Vector = new ECS.Vector();
	constructor() {}
}

class Character {
	constructor() {}

	goto(state_name: string) {}
}

export class Sprite extends ECS.Component {
	width: number;
	height: number;
	color: string;
	visible: boolean = true;
	image: HTMLImageElement;
	time: number = 0;

	constructor(params: { width: number; height: number; color?: string; image?: HTMLImageElement }) {
		super();
		this.width = params.width;
		this.height = params.height;
		this.color = params.color ?? "red";
		this.image = params.image;
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
	dashing: boolean = false;
	jumping: boolean = false;
	allowed_jumps: number = 2;
	allowed_dashes: number = 1;
	dash_allowed: boolean = true;
	goal: ECS.Vector = new ECS.Vector();
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
		maxTTL: 0.5,
		minSize: 1,
		maxSize: 3,
		maxCount: 10,
		drag: 0.1,
		speed: 40,
		active: false,
		gravity: -400,
		emitterRadius: 4,
		particlesPerSecond: 1000,
		finiteParticles: true,
	});

	/*
	explosion: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.1,
		maxTTL: 1,
		minSize: 1,
		maxSize: 4,
		gravity: 400,
		emitterRadius: 4,
		maxCount: 10,
		particlesPerSecond: 1000,
		speed: 120,
		drag: 0.05,
		active: false,
		finiteParticles: true,
	});
	*/
}
