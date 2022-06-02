import { IVector, Vector } from "./vector";
import { randomFloat, randomInteger } from "./index";
import { UpdateParams } from "../ecs";

type HEX = `#${string}`;
type RGB = `rgb(${number}, ${number}, ${number})`;
type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`;
type Color = RGB | RGBA | HEX;

type ParticleColor = Color | "random";

interface Particle {
	pos: Vector;
	vel: Vector;
	ttl: number;
	size: number;
	color: Color;
	gravity: number;
	active: boolean;
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
	private emitterSize: Vector;
	private drag: number;
	private offset: Vector;
	private color: ParticleColor;

	active: boolean = true;

	constructor(params: {
		minTTL: number;
		maxTTL: number;
		minSize: number;
		active?: boolean;
		maxSize: number;
		offset?: Vector;
		speed: number;
		emitterSize?: Vector;
		finiteParticles?: boolean;
		gravity: number;
		drag?: number;
		maxCount: number;
		particlesPerSecond: number;
		color?: ParticleColor;
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
		this.drag = params.drag || 0;
		this.emitterSize = params.emitterSize || new Vector(1, 1);
		this.offset = params.offset || new Vector();
		this.particlesPerSecond = params.particlesPerSecond;
		this.color = params.color || "#ffffff";
	}

	private createParticle(position: IVector): Particle {
		//const shape_offset = new Vector().random_unit_vector().scalarMult(this.emitterRadius);

		let A = this.emitterSize.x / 2;
		let B = this.emitterSize.y / 2;
		let r = A * Math.sqrt(Math.random());
		let phi = 2 * Math.PI * Math.random();
		const shape_offset = new Vector(r * Math.cos(phi), (B / A) * r * Math.sin(phi));

		const color: Color =
			this.color == "random"
				? `rgb(${randomInteger(0, 255)}, ${randomInteger(0, 255)}, ${randomInteger(0, 255)})`
				: this.color;

		const particle: Particle = {
			ttl: randomFloat(this.minTTL, this.maxTTL),
			size: randomInteger(this.minSize, this.maxSize),
			active: true,
			color,
			gravity: this.gravity,
			pos: new Vector(position.x + this.offset.x + shape_offset.x, position.y + this.offset.y + shape_offset.y),
			vel: new Vector().random_unit_vector().scalarMult(this.speed),
		};

		return particle;
	}

	stop_emitting() {
		this.active = false;
	}

	start_emitting() {
		this.active = true;
	}

	reset() {
		this.time = 0;
		this.particles = [];
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

			params.context.fillStyle = particle.color;
			params.context.fillRect(
				Math.round(particle.pos.x - particle.size / 2),
				Math.round(particle.pos.y - particle.size / 2),
				particle.size,
				particle.size
			);
		}

		if (!this.finiteParticles && this.particles.length > this.maxCount) {
			this.particles.splice(0, this.particles.length - this.maxCount);
		}
	}
}

export { Particle, ParticleSystem };
