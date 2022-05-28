import * as ECS from "../../../src";
import { BACKGROUND_COLOR, FOREGROUND_COLOR } from "./main";

export class Forces extends ECS.VectorComponent {
	mass: number = 10;
}

export class Animation {
	repeat: boolean;
	frame: ECS.Vector = new ECS.Vector();
	frames: number;
	name: string;
	constructor(params: { name: string; repeat?: boolean; frames?: number; y?: number; x?: number }) {
		this.name = params.name;
		this.repeat = params.repeat;
		this.frame.set(params.x ?? 0, params.y ?? 0);
		this.frames = params.frames ?? 1;
	}
}

export class Animations {
	current: Animation | undefined;
	next: Animation | undefined;
	last: Animation | undefined;
	animations: Map<string, Animation> = new Map();
	time: number = 0;

	constructor(animations: Animation[]) {
		for (const animation of animations) {
			if (!this.current) this.current = animation;
			this.animations.set(animation.name, animation);
		}
	}

	get frameX() {
		if (this.current) return this.current.frame.x;
		console.log("no current");
		return 0;
	}

	get frameY() {
		if (this.current) return this.current.frame.y;
		console.log("no current");
		return 0;
	}

	add(animation: Animation) {
		this.animations.set(animation.name, animation);
	}

	play(name: string) {
		if (name == this.current.name) return;

		const next = this.animations.get(name);
		next.frame.x = 0;

		if (this.current.repeat) {
			this.last = this.current;
			this.next = null;
			this.current = next;
		} else {
			this.next = next;
		}
	}

	update(dt: number) {
		if (!this.current) return;

		if (this.current.frames > 1) {
			if ((this.time += dt) > 1 / 10) {
				this.current.frame.x = (this.current.frame.x + 1) % this.current.frames;
				this.time = 0;
			}
		}

		if (!this.current.repeat) {
			if (this.current.frame.x == this.current.frames - 1) {
				if (this.next) {
					this.current = this.next;
				} else {
					this.current = this.last;
				}
			}
		}
	}
}

export class Sprite extends ECS.Component {
	width: number;
	height: number;
	color: string;
	visible: boolean = true;
	image: HTMLImageElement;
	time: number = 0;
	animations: Animations;
	offset: ECS.Vector;

	constructor(params: {
		width: number;
		height: number;
		color?: string;
		offset?: ECS.Vector;
		image?: HTMLImageElement;
		animations?: Animations;
	}) {
		super();
		this.width = params.width;
		this.height = params.height;
		this.color = params.color ?? "red";
		this.image = params.image;
		this.offset = params.offset ?? new ECS.Vector();
		this.animations = params.animations;
	}
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
	allowed_jumps: number = 1;
	allowed_dashes: number = 1;
	goal: ECS.Vector = new ECS.Vector();
	coyote_time: number = 0;
	current: ECS.Vector = new ECS.Vector();
}

export class ParticleEmitter extends ECS.Component {
	dash: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.2,
		maxTTL: 0.5,
		minSize: 1,
		maxSize: 1,
		gravity: -100,
		emitterSize: new ECS.Vector(12, 12),
		maxCount: 500,
		particlesPerSecond: 150,
		speed: 0,
		color: FOREGROUND_COLOR,
	});

	dust: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.1,
		maxTTL: 0.3,
		minSize: 1,
		maxSize: 2,
		maxCount: 20,
		color: FOREGROUND_COLOR,
		offset: new ECS.Vector(0, 7),
		drag: 0.3,
		speed: 50,
		active: false,
		gravity: -200,
		emitterSize: new ECS.Vector(6, 2),
		particlesPerSecond: 1000,
		finiteParticles: true,
	});

	collect: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.1,
		maxTTL: 0.5,
		minSize: 1,
		maxSize: 2,
		maxCount: 10,
		color: "#f4b41b",
		drag: 0.2,
		speed: 70,
		active: false,
		gravity: 100,
		emitterSize: new ECS.Vector(4, 4),
		particlesPerSecond: 1000,
		finiteParticles: true,
	});

	jump: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.1,
		maxTTL: 0.4,
		color: FOREGROUND_COLOR,
		minSize: 1,
		maxSize: 2,
		offset: new ECS.Vector(0, 8),
		emitterSize: new ECS.Vector(2, 2),
		gravity: -100,
		maxCount: 100,
		particlesPerSecond: 150,
		speed: 0,
	});

	explosion: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.1,
		maxTTL: 0.5,
		minSize: 1,
		maxSize: 2,
		maxCount: 10,
		color: FOREGROUND_COLOR,
		drag: 0.1,
		speed: 40,
		active: false,
		gravity: -300,
		emitterSize: new ECS.Vector(6, 8),
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
