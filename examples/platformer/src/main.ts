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
import { SpriteSystem, PhysicsSystem, CollisionSystem, MovementSystem, SpawnSystem, ParticleSystem } from "./systems";

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

export class Shake {
	OFFSET_X = 0;
	OFFSET_Y = 0;

	private static magnitude: number = 2;
	private static duration: number = 0.2;
	private time: number = 0;

	update(dt: number) {
		if ((this.time -= dt) > 0) {
			this.OFFSET_X = ECS.randomInteger(-Shake.magnitude, Shake.magnitude);
			this.OFFSET_Y = ECS.randomInteger(-Shake.magnitude, Shake.magnitude);
		} else {
			this.OFFSET_X = 0;
			this.OFFSET_Y = 0;
		}
	}

	shake() {
		this.time = Shake.duration;
	}
}

const pixel = (x: number, y: number, image: ImageData) => {
	let index = y * (image.width * 4) + x * 4;
	let r = image.data[index + 0];
	let g = image.data[index + 1];
	let b = image.data[index + 2];
	let a = image.data[index + 3];
	return [r, g, b, a];
};



export class Game {
	animateBind: FrameRequestCallback = this.animate.bind(this);
	ecs: ECS.ECS = new ECS.ECS();
	then: number = 0;
	level: number = 1;
	max_level: number = 3;
	data: any;

	shake: Shake = new Shake();
	sound: Sound = new Sound();

	static fetchLevelData(url: string) {
		return new Promise((resolve, reject) => {
			const objects = [];

			const image = new Image();
			image.src = url;
			image.onerror = (e) => reject(e);

			image.onload = () => {
				const c = document.createElement("canvas");
				c.width = image.width;
				c.height = image.height;
				const ctx = c.getContext("2d");
				ctx.drawImage(image, 0, 0);
				const data = ctx.getImageData(0, 0, image.width, image.height);

				for (let x = 0; x < image.width; x++) {
					for (let y = 0; y < image.height; y++) {
						const [r, g, b, a] = pixel(x, y, data);
						if (r == 255 && g == 255 && b == 255) continue;

						const object = { x, y, type: "" };

						if (r == 255 && g == 0 && b == 0) {
							object.type = "player";
						} else if (r == 0 && g == 255 && b == 0) {
							object.type = "tile";
						} else if (r == 0 && g == 0 && b == 255) {
							object.type = "spike";
						} else if (r == 0 && g == 255 && b == 255) {
							object.type = "bounce";
						} else if (r == 255 && g == 0 && b == 255) {
							object.type = "dash";
						}
						objects.push(object);
					}
				}

				resolve(objects);
			};
		});
	}

	createLevel(player_pos?: ECS.Vector, player_vel?: ECS.Vector) {
		const TILESIZE = 8;
		for (const { x, y, type } of this.data) {
			const pos = new ECS.Vector(x * TILESIZE, y * TILESIZE);

			switch (type) {
				case "player": {
					this.ecs.addEntity(Factory.createPlayer(player_pos || pos, player_vel));
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

	clearLevel() {
		this.ecs.clearEntities();
	}

	setup() {
		this.ecs.addSystem(new ECS.InputSystem(canvas));
		this.ecs.addSystem(new MovementSystem());
		this.ecs.addSystem(new CollisionSystem(quadtree));
		this.ecs.addSystem(new PhysicsSystem());
		this.ecs.addSystem(new SpawnSystem());
		this.ecs.addSystem(new ParticleSystem());
		this.ecs.addSystem(new SpriteSystem());

		Game.fetchLevelData("assets/level-1.png")
			.then((json) => {
				this.data = json;
				this.createLevel();
				this.animate(0);
			})
			.catch((e) => {
				console.log("failed to load level", e);
			});
	}

	animate(now: number) {
		now *= 0.001;
		let dt = now - this.then;
		this.then = now;

		/*
		if ((timer += dt) > 1) {
			timer = 0;
			fps.innerText = `${(1 / dt).toFixed(2)}`;
		}
		*/

		if (dt > 1 / 30) dt = 1 / 30;

		if (!paused) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.fillStyle = "#D3D3D3";
			context.fillRect(0, 0, canvas.width, canvas.height);

			this.shake.update(dt);

			this.ecs.update({
				dt: dt,
				canvas,
				ecs: this.ecs,
				context,
				sound: this.sound,
				game: this,
				shaker: this.shake,
			});
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
