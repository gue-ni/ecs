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

	active: boolean = true;

	constructor(params: {
		minTTL: number;
		maxTTL: number;
		minSize: number;
		active?: boolean;
		maxSize: number;
		speed: number;
		finiteParticles?: boolean;
		gravity: number;
		maxCount: number;
		emitterRadius?: number;
		particlesPerSecond: number;
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
		this.particlesPerSecond = params.particlesPerSecond;
	}

	private createParticle(position: IVector): Particle {
		const offset = new Vector().random_unit_vector().scalarMult(this.emitterRadius);

		const particle: Particle = {
			ttl: randomFloat(this.minTTL, this.maxTTL),
			size: randomInteger(this.minSize, this.maxSize),
			active: true,
			alpha: 1,
			gravity: this.gravity,
			pos: new Vector(position.x + offset.x, position.y + offset.y),
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

			particle.vel.x -= particle.vel.x * 0.01;
			particle.vel.y -= particle.vel.y * 0.01;

			particle.vel.y += particle.gravity * params.dt;

			particle.pos.round();

			params.context.fillStyle = `rgba(255,255,255,${particle.alpha})`;
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
