import * as ECS from "../../../src";
import {
	Sprite,
	Respawn,
	Health,
	Gravity,
	Bouncy,
	Spike,
	Collectible,
	CollectibleType,
	Controller,
} from "./components";
import { Factory } from "./factory";
import { SpriteSystem, PhysicsSystem, CollisionSystem, MovementSystem, HealthSystem, ForceMovement } from "./systems";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
const fps: HTMLElement = document.getElementById("fps-display") as HTMLElement;

let paused = false;

const quadtree = new ECS.QuadTree(
	0,
	new ECS.Rectangle(new ECS.Vector(), new ECS.Vector(canvas.width, canvas.height)),
	2,
	5
);

export class Sound {
	audioContext: AudioContext;
	constructor() {
		let AudioContext = window.AudioContext;
		this.audioContext = new AudioContext();
	}

	play(duration: number, frequency: number, volume: number = 1) {
		let oscillator = this.audioContext.createOscillator();
		let gainNode = this.audioContext.createGain();

		duration = duration / 1000;
		oscillator.frequency.value = frequency;
		gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
		gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + duration * 0.8);
		gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration * 1);
		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);
		oscillator.type = "triangle";

		oscillator.start(this.audioContext.currentTime);
		oscillator.stop(this.audioContext.currentTime + duration);
	}
}

interface GameParams extends ECS.UpdateParams {
	sound: Sound;
}

class Game {
	animateBind: FrameRequestCallback = this.animate.bind(this);
	ecs: ECS.ECS = new ECS.ECS();
	dt: number = 0;
	then: number = 0;

	sound: Sound = new Sound();

	loadLevel(json: any) {
		const TILESIZE = 8;
		for (const { x, y, type } of json) {
			let pos = new ECS.Vector(x * TILESIZE, canvas.height - y * TILESIZE - TILESIZE);

			switch (type) {
				case "player": {
					this.ecs.addEntity(Factory.createPlayer(pos));
					break;
				}

				case "tile": {
					this.ecs.addEntity(Factory.createTile(pos));
					break;
				}

				case "dash": {
					this.ecs.addEntity(Factory.createDash(pos));
					break;
				}

				case "bounce": {
					this.ecs.addEntity(Factory.createBounce(pos));
					break;
				}

				case "spike": {
					this.ecs.addEntity(Factory.createSpike(pos));
					break;
				}
			}
		}
	}

	setup() {
		console.log("setup");

		this.ecs.addSystem(new ECS.InputSystem(canvas));
		this.ecs.addSystem(new ForceMovement());
		this.ecs.addSystem(new CollisionSystem(quadtree));
		this.ecs.addSystem(new PhysicsSystem());
		this.ecs.addSystem(new HealthSystem());
		this.ecs.addSystem(new SpriteSystem());

		// load level
		fetch("assets/level-1.json")
			.then((res) => res.json())
			.then((json) => {
				this.loadLevel(json);
			});

		this.animate(0);
	}

	animate(now: number) {
		now *= 0.001;
		this.dt = now - this.then;
		this.then = now;

		/*
		if ((timer += dt) > 1) {
			timer = 0;
			fps.innerText = `${(1 / dt).toFixed(2)}`;
		}
		*/

		if (this.dt > 1 / 30) this.dt = 1 / 30;

		if (!paused) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.fillStyle = "#D3D3D3";
			context.fillRect(0, 0, canvas.width, canvas.height);

			this.ecs.update({ dt: this.dt, canvas, context, sound: this.sound, game: this });
		}

		requestAnimationFrame(this.animateBind);
	}
}

let g = new Game();
g.setup();

/*

let dt: number = 0;
let then: number = 0;
let timer = 0;
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;

	if ((timer += dt) > 1) {
		timer = 0;
		fps.innerText = `${(1 / dt).toFixed(2)}`;
	}

	if (dt > 1 / 30) dt = 1 / 30;

	if (!paused) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "#D3D3D3";
		context.fillRect(0, 0, canvas.width, canvas.height);

		ecs.update({ dt, canvas, context });
	}

	requestAnimationFrame(animate);
}
*/

document.addEventListener("keydown", (e) => {
	if (e.code == "KeyP") paused = !paused;
});
