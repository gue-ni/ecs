import * as ECS from "../../../src";
import { Factory } from "./factory";
import {
	SpriteSystem,
	PhysicsSystem,
	CollisionSystem,
	MovementSystem,
	SpawnSystem,
	ParticleSystem,
	AnimationSystem,
} from "./systems";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
const fps: HTMLElement = document.getElementById("fps-display") as HTMLElement;

const ON_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

console.log({ ON_MOBILE });

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

export class Game extends ECS.ECS {
	//ecs: ECS.ECS = new ECS.ECS();
	then: number = 0;
	level: number = 1;
	max_level: number = 4;
	data: any;

	shake: Shake = new Shake();
	sound: Sound = new Sound();

	animateBind: FrameRequestCallback = this.animate.bind(this);

	static fetchLevelData(url: string) {
		const get_type = (r: number, g: number, b: number) => {
			if (r == 255 && g == 0 && b == 0) {
				return "player";
			} else if (r == 0 && g == 255 && b == 0) {
				return "tile";
			} else if (r == 0 && g == 0 && b == 255) {
				return "spike";
			} else if (r == 0 && g == 255 && b == 255) {
				return "bounce";
			} else if (r == 255 && g == 0 && b == 255) {
				return "dash";
			} else {
				return null;
			}
		};

		const parse_xy = (x: number, y: number, image: ImageData) => {
			if (x < 0 || x > image.width - 1 || y < 0 || y > image.height - 1) return "tile";

			const [r, g, b, a] = pixel(x, y, image);

			if (r == 255 && g == 0 && b == 0) {
				return "player";
			} else if (r == 0 && g == 255 && b == 0) {
				return "tile";
			} else if (r == 0 && g == 0 && b == 255) {
				return "spike";
			} else if (r == 0 && g == 255 && b == 255) {
				return "bounce";
			} else if (r == 255 && g == 0 && b == 255) {
				return "dash";
			} else if (r == 255 && g == 255 && b == 0) {
				return "platform";
			} else {
				return null;
			}
		};

		const pixel = (x: number, y: number, image: ImageData) => {
			let index = y * (image.width * 4) + x * 4;
			let r = image.data[index + 0];
			let g = image.data[index + 1];
			let b = image.data[index + 2];
			let a = image.data[index + 3];
			return [r, g, b, a];
		};

		const parse = (x: number, y: number, image: ImageData) => {
			const t = parse_xy(x, y, image);
			if (!t) return null;

			let side = "up";

			const tile = "tile";

			if (t == "tile") {
				if (
					parse_xy(x, y - 1, image) != tile &&
					parse_xy(x, y + 1, image) == tile &&
					parse_xy(x + 1, y, image) == tile &&
					parse_xy(x - 1, y, image) != tile
				) {
					side = "top-left";
				} else if (
					parse_xy(x, y - 1, image) != tile &&
					parse_xy(x, y + 1, image) == tile &&
					parse_xy(x + 1, y, image) != tile &&
					parse_xy(x - 1, y, image) == tile
				) {
					side = "top-right";
				} else if (
					parse_xy(x, y - 1, image) == tile &&
					parse_xy(x, y + 1, image) != tile &&
					parse_xy(x + 1, y, image) != tile &&
					parse_xy(x - 1, y, image) == tile
				) {
					side = "bottom-right";
				} else if (
					parse_xy(x, y - 1, image) == tile &&
					parse_xy(x, y + 1, image) != tile &&
					parse_xy(x + 1, y, image) == tile &&
					parse_xy(x - 1, y, image) != tile
				) {
					side = "bottom-left";
				} else if (
					parse_xy(x, y - 1, image) == tile &&
					parse_xy(x, y + 1, image) == tile &&
					parse_xy(x + 1, y, image) == tile &&
					parse_xy(x - 1, y, image) != tile
				) {
					side = "left";
				} else if (
					parse_xy(x, y - 1, image) == tile &&
					parse_xy(x, y + 1, image) == tile &&
					parse_xy(x + 1, y, image) != tile &&
					parse_xy(x - 1, y, image) == tile
				) {
					side = "right";
				} else if (
					parse_xy(x, y - 1, image) == tile &&
					parse_xy(x, y + 1, image) != tile &&
					parse_xy(x + 1, y, image) == tile &&
					parse_xy(x - 1, y, image) == tile
				) {
					side = "down";
				} else if (
					parse_xy(x, y - 1, image) != tile &&
					parse_xy(x, y + 1, image) == tile &&
					parse_xy(x + 1, y, image) == tile &&
					parse_xy(x - 1, y, image) == tile
				) {
					side = "up";
				} else {
					//console.log({ x, y, w: image.width, h: image.height });
					side = "middle";
				}
			}

			let object = { x, y, type: t, side };
			return object;
		};

		return new Promise((resolve, reject) => {
			const objects = [];

			const image = new Image();
			image.src = url;
			image.onerror = (e) => reject(e);

			image.onload = () => {
				const cnvs = document.createElement("canvas");
				cnvs.width = image.width;
				cnvs.height = image.height;
				const ctx = cnvs.getContext("2d");
				ctx.drawImage(image, 0, 0);
				const data = ctx.getImageData(0, 0, image.width, image.height);

				for (let x = 0; x < image.width; x++) {
					for (let y = 0; y < image.height; y++) {
						/*
						const [r, g, b, a] = pixel(x, y, data);
						const type = get_type(r, g, b);

						if (!type) continue;

						const object = { x, y, type };
						*/

						const object = parse(x, y, data);

						/*
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
						*/
						if (object) {
							objects.push(object);
						}
					}
				}

				resolve(objects);
			};
		});
	}

	createLevel(player_pos?: ECS.Vector, player_vel?: ECS.Vector) {
		const TILESIZE = 8;
		for (const { x, y, type, side } of this.data) {
			const pos = new ECS.Vector(x * TILESIZE, y * TILESIZE);

			switch (type) {
				case "player": {
					this.addEntity(Factory.createPlayer(player_pos || pos, player_vel));
					break;
				}

				case "tile": {
					this.addEntity(Factory.createTile(pos, side));
					break;
				}

				case "dash": {
					this.addEntity(Factory.createDash(pos));
					break;
				}

				case "bounce": {
					this.addEntity(Factory.createBounce(pos));
					break;
				}

				case "platform": {
					this.addEntity(Factory.createPlatform(pos));
					break;
				}

				case "spike": {
					this.addEntity(Factory.createSpike(pos));
					break;
				}

				default: {
				}
			}
		}
	}

	clearLevel() {
		this.clearEntities();
	}

	setup() {
		this.addSystem(ON_MOBILE ? new ECS.MobileInputSystem() : new ECS.InputSystem(canvas));
		this.addSystem(new MovementSystem());
		this.addSystem(new CollisionSystem(quadtree));
		this.addSystem(new PhysicsSystem());
		this.addSystem(new SpawnSystem());
		this.addSystem(new ParticleSystem());
		this.addSystem(new AnimationSystem());
		this.addSystem(new SpriteSystem());

		Game.fetchLevelData(`assets/level-${this.level}.png`)
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
			//context.fillStyle = "#D3D3D3";
			context.fillStyle = "#000";
			context.fillRect(0, 0, canvas.width, canvas.height);

			this.shake.update(dt);

			this.update({
				dt: dt,
				canvas,
				ecs: this,
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

document.addEventListener(
	"touchstart",
	() => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().then(() => {
				screen.orientation.lock("landscape");
			});
		}
	},
	false
);
