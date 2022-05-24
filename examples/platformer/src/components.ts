import * as ECS from "../../../lib";
import { BACKGROUND_COLOR, FOREGROUND_COLOR } from "./main";

export class Forces extends ECS.VectorComponent {
	mass: number = 10;
}

export class Animation {
	repeat: boolean;
	frame: ECS.Vector = new ECS.Vector();
	frames: number;
	name: string;
	constructor(params: { name: string; repeat?: boolean; frames?: number; row?: number }) {
		this.name = params.name;
		this.repeat = params.repeat;
		this.frame.set(0, params.row ?? 0);
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
		return 0;
	}

	get frameY() {
		if (this.current) return this.current.frame.y;
		return 0;
	}

	add(animation: Animation) {
		this.animations.set(animation.name, animation);
	}

	play(name: string) {
		if (!this.current) return;

		if (this.current.name === name) return;

		this.last = this.current;

		if (!this.current.repeat) {
			this.next = this.animations.get(name);
			return;
		} else {
			this.next = undefined;
		}

		this.current = this.animations.get(name);
		//this.current.frame.x = 0;
	}

	update(dt: number) {
		if (!this.current) return;

		if (this.current.frames > 1) {
			if ((this.time += dt) > 1 / 12) {
				this.current.frame.x = (this.current.frame.x + 1) % this.current.frames;
				this.time = 0;
			}

			if (!this.current.repeat && this.current.frame.x == this.current.frames - 1) {
				if (this.next) {
					this.play(this.next.name);
					return;
				}

				if (this.last) {
					this.play(this.last.name);
					return;
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
		maxSize: 1,
		gravity: -100,
		emitterRadius: 4,
		maxCount: 500,
		particlesPerSecond: 130,
		speed: 0,
		color: FOREGROUND_COLOR,
	});

	jump: ECS.ParticleSystem = new ECS.ParticleSystem({
		minTTL: 0.1,
		color: FOREGROUND_COLOR,
		maxTTL: 0.4,
		minSize: 1,
		maxSize: 2,
		offset: new ECS.Vector(0, 8),
		gravity: -100,
		maxCount: 50,
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
