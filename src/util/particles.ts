import { IVector, Vector } from "./vector";
import { randomFloat, randomInteger } from "./index";
import { UpdateParams } from "../ecs";

interface Particle {
	pos: Vector;
	vel: Vector;
	ttl: number;
	size: number;
	gravity: number;
	active: boolean;
	alpha: number;
	color: string;
}

interface ParticleEmitter {
	particles: Particle[];
	maxCount: number;
	minSize: number;
	maxSize: number;
	minTTL: number;
	maxTTL: number;
	speed: number;
	alpha?: number;
	particlePerSecond?: number;
	positionSpread?: number;
	positionOffset?: Vector;
	gravity?: number;
	explosive?: boolean;
	emit?: boolean;
	color?: string;
}

class ParticleSystem {
	private particles: Particle[] = [];

	private time: number = 0;

	private minTTL: number;
	private maxTTL: number;
	private minSize: number;
	private maxSize: number;
	private speed: number;
	private gravity: number;
	private finiteParticles: boolean;
	private maxCount: number;
	private particlesPerSecond: number;
	private emitterRadius: number;
	private drag: number;
	private offset: Vector;
	private color: string;

	active: boolean = true;

	constructor(params: {
		minTTL: number;
		maxTTL: number;
		minSize: number;
		active?: boolean;
		maxSize: number;
		offset?: Vector;
		speed: number;
		finiteParticles?: boolean;
		gravity: number;
		drag?: number;
		maxCount: number;
		emitterRadius?: number;
		particlesPerSecond: number;
		color?: string;
	}) {
		this.minTTL = params.minTTL;
		this.maxTTL = params.maxTTL;
		this.minSize = params.minSize;
		this.maxSize = params.maxSize;
		this.speed = params.speed;
		this.finiteParticles = params.finiteParticles ?? false;
		this.active = params.active ?? true;
		this.gravity = params.gravity;
		this.maxCount = params.maxCount;
		this.emitterRadius = params.emitterRadius || 1;
		this.drag = params.drag || 0;
		this.offset = params.offset || new Vector();
		this.particlesPerSecond = params.particlesPerSecond;
		this.color = params.color || "#ffffff";
	}

	private createParticle(position: IVector): Particle {
		const offset = new Vector().random_unit_vector().scalarMult(this.emitterRadius);

		const particle: Particle = {
			ttl: randomFloat(this.minTTL, this.maxTTL),
			size: randomInteger(this.minSize, this.maxSize),
			active: true,
			color: this.color,
			alpha: 1,
			gravity: this.gravity,
			pos: new Vector(position.x + this.offset.x + offset.x, position.y + this.offset.y + offset.y),
			vel: new Vector().random_unit_vector().scalarMult(this.speed),
		};

		return particle;
	}

	update(position: IVector, params: UpdateParams): void {
		const freq = 1 / this.particlesPerSecond;

		if ((this.time += params.dt) > freq) {
			let num = Math.round(this.time / freq);

			if (this.active && (!this.finiteParticles || this.particles.length < this.maxCount)) {
				for (let i = 0; i < num; i++) {
					this.particles.push(this.createParticle(position));
				}
			}

			this.time = 0;
		}

		for (const particle of this.particles) {
			if ((particle.ttl -= params.dt) < 0) continue;

			particle.pos.x += particle.vel.x * params.dt;
			particle.pos.y += particle.vel.y * params.dt;

			particle.vel.x -= particle.vel.x * this.drag;
			particle.vel.y -= particle.vel.y * this.drag;

			particle.vel.y += particle.gravity * params.dt;

			particle.pos.round();

			params.context.fillStyle = particle.color;
			params.context.fillRect(
				Math.round(particle.pos.x - Math.round(particle.size / 2)),
				Math.round(particle.pos.y - Math.round(particle.size / 2)),
				particle.size,
				particle.size
			);
		}

		if (!this.finiteParticles && this.particles.length > this.maxCount) {
			this.particles.splice(0, this.particles.length - this.maxCount);
		}
	}
}

export { Particle, ParticleSystem, ParticleEmitter };
