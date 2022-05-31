import { ParametricBufferGeometry } from "three";
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
	CollectibleSystem,
	LightSystem,
} from "./systems";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
const fps: HTMLElement = document.getElementById("fps-display") as HTMLElement;

const ON_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (ON_MOBILE && !window.location.href.includes("mobile.html")) {
	window.location.href = "mobile.html";
}

export const FOREGROUND_COLOR = "#ffffff";
export const BACKGROUND_COLOR = "#392946";

/*
export const BACKGROUND_COLOR = "#382B26";
export const FOREGROUND_COLOR = "#ffffff";
export const FOREGROUND_COLOR = "#B8C2B9";
export const BACKGROUND_COLOR = "#000";
*/

export const TILESIZE = 8;

export const SPRITESHEET = new Image();
SPRITESHEET.src = "assets/spritesheet.png";

let paused = false;

const quadtree = new ECS.QuadTree(
	0,
	new ECS.Rectangle(new ECS.Vector(), new ECS.Vector(canvas.width, canvas.height)),
	2,
	5
);

export class NumberRenderer {
	private canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;
	private spritesheet: HTMLImageElement;
	private offset: ECS.Vector;
	private letterSize: ECS.Vector = new ECS.Vector(6, 8);

	constructor(params: { spritesheet: HTMLImageElement; offset: ECS.Vector }) {
		this.canvas = document.createElement("canvas");
		this.context = this.canvas.getContext("2d");
		this.canvas.width = this.letterSize.x * 10;
		this.canvas.height = this.letterSize.y;
		this.spritesheet = params.spritesheet;
		this.offset = params.offset;
	}

	renderNumber(context: CanvasRenderingContext2D, x: number, y: number, num: number) {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = "rgba(0, 0, 0, 0)";
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

		let str = num.toString();
		for (let i = 0; i < str.length; i++) {
			let digit = parseInt(str[i]);
			if (isNaN(digit)) digit = 10;

			this.context.drawImage(
				this.spritesheet,
				this.offset.x + digit * this.letterSize.x,
				this.offset.y,
				this.letterSize.x,
				this.letterSize.y,
				this.letterSize.x * i,
				0,
				this.letterSize.x,
				this.letterSize.y
			);
		}

		context.drawImage(this.canvas, x, y, this.canvas.width, this.canvas.height);
	}
}

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

	private static magnitude: number = 3;
	private static duration: number = 0.25;
	private time: number = 0;

	update(dt: number) {
		if ((this.time -= dt) > 0) {
			this.OFFSET_X = ECS.randomFloat(-Shake.magnitude, Shake.magnitude);
			this.OFFSET_Y = ECS.randomFloat(-Shake.magnitude, Shake.magnitude);
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
	max_level: number = 6;
	data: any;

	private then: number = 0;
	private timer: number = 0;
	private loaded_at: number = 0;

	shake: Shake = new Shake();
	sound: Sound = new Sound();
	numbers: NumberRenderer = new NumberRenderer({
		spritesheet: SPRITESHEET,
		offset: new ECS.Vector(6 * TILESIZE, 0),
	});

	private frame: number = 0;
	recording: boolean = false;
	private frameTimer: number = 0;

	animateBind: FrameRequestCallback = this.animate.bind(this);

	static autoTiling(url: string) {
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

		const parseTile = (x: number, y: number, image: ImageData) => {
			const t = parse_xy(x, y, image);
			if (!t) return null;

			let side = "up";

			const tl = "tile";

			if (t == "tile") {
				if (
					parse_xy(x, y - 1, image) != tl &&
					parse_xy(x, y + 1, image) == tl &&
					parse_xy(x + 1, y, image) == tl &&
					parse_xy(x - 1, y, image) != tl
				) {
					side = "top-left";
				} else if (
					parse_xy(x, y - 1, image) != tl &&
					parse_xy(x, y + 1, image) == tl &&
					parse_xy(x + 1, y, image) != tl &&
					parse_xy(x - 1, y, image) == tl
				) {
					side = "top-right";
				} else if (
					parse_xy(x, y - 1, image) == tl &&
					parse_xy(x, y + 1, image) != tl &&
					parse_xy(x + 1, y, image) != tl &&
					parse_xy(x - 1, y, image) == tl
				) {
					side = "bottom-right";
				} else if (
					parse_xy(x, y - 1, image) == tl &&
					parse_xy(x, y + 1, image) != tl &&
					parse_xy(x + 1, y, image) == tl &&
					parse_xy(x - 1, y, image) != tl
				) {
					side = "bottom-left";
				} else if (
					parse_xy(x, y - 1, image) == tl &&
					parse_xy(x, y + 1, image) == tl &&
					parse_xy(x + 1, y, image) == tl &&
					parse_xy(x - 1, y, image) == tl &&
					parse_xy(x - 1, y - 1, image) != tl
				) {
					side = "up";
				} else if (
					parse_xy(x, y - 1, image) == tl &&
					parse_xy(x, y + 1, image) == tl &&
					parse_xy(x + 1, y, image) == tl &&
					parse_xy(x - 1, y, image) == tl &&
					parse_xy(x + 1, y - 1, image) != tl
				) {
					side = "up";
				} else if (
					parse_xy(x, y - 1, image) == tl &&
					parse_xy(x, y + 1, image) == tl &&
					parse_xy(x + 1, y, image) == tl &&
					parse_xy(x - 1, y, image) == tl &&
					parse_xy(x + 1, y + 1, image) != tl
				) {
					side = "down";
				} else if (
					parse_xy(x, y - 1, image) == tl &&
					parse_xy(x, y + 1, image) == tl &&
					parse_xy(x + 1, y, image) == tl &&
					parse_xy(x - 1, y, image) == tl &&
					parse_xy(x - 1, y + 1, image) != tl
				) {
					side = "down";
				} else if (
					parse_xy(x, y - 1, image) == tl &&
					parse_xy(x, y + 1, image) == tl &&
					parse_xy(x + 1, y, image) == tl &&
					parse_xy(x - 1, y, image) != tl
				) {
					side = "left";
				} else if (
					parse_xy(x, y - 1, image) == tl &&
					parse_xy(x, y + 1, image) == tl &&
					parse_xy(x + 1, y, image) != tl &&
					parse_xy(x - 1, y, image) == tl
				) {
					side = "right";
				} else if (
					parse_xy(x, y - 1, image) == tl &&
					parse_xy(x, y + 1, image) != tl &&
					parse_xy(x + 1, y, image) == tl &&
					parse_xy(x - 1, y, image) == tl
				) {
					side = "down";
				} else if (
					parse_xy(x, y - 1, image) != tl &&
					parse_xy(x, y + 1, image) == tl &&
					parse_xy(x + 1, y, image) == tl &&
					parse_xy(x - 1, y, image) == tl
				) {
					side = "up";
				} else {
					//console.log({ x, y, w: image.width, h: image.height });
					side = "middle";
				}
			}

			if (t == "spike") {
				if (parse_xy(x + 1, y, image) == tl && parse_xy(x - 1, y, image) == null) {
					side = "left";
				} else if (parse_xy(x + 1, y, image) == null && parse_xy(x - 1, y, image) == tl) {
					side = "right";
				} else if (parse_xy(x, y - 1, image) == null && parse_xy(x, y + 1, image) == tl) {
					side = "up";
				} else if (parse_xy(x, y - 1, image) == tl && parse_xy(x, y + 1, image) == null) {
					side = "down";
				} else {
					side = "up";
				}
			}

			return { x, y, type: t, side };
		};

		return new Promise((resolve, reject) => {
			const objects = [];

			const image = new Image();
			image.src = url;
			image.onerror = (e) => reject(e);

			image.onload = () => {
				const cnvs = document.createElement("canvas");
				(cnvs.width = image.width), (cnvs.height = image.height);
				const ctx = cnvs.getContext("2d");
				ctx.drawImage(image, 0, 0);
				const data = ctx.getImageData(0, 0, image.width, image.height);

				for (let x = 0; x < image.width; x++) {
					for (let y = 0; y < image.height; y++) {
						const object = parseTile(x, y, data);
						if (object) objects.push(object);
					}
				}

				resolve(objects);
			};
		});
	}

	get deaths() {
		return parseInt(localStorage.getItem("deaths")) || 0;
	}

	set deaths(x: number) {
		localStorage.setItem("deaths", x.toString());
	}

	get level() {
		return parseInt(localStorage.getItem("level")) || 1;
	}

	set level(x: number) {
		if (x > this.max_level || x < 1) return;
		localStorage.setItem("level", x.toString());
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
					this.addEntity(Factory.createCoin(pos));
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
					this.addEntity(Factory.createSpike(pos, side));
					break;
				}
			}
		}
	}

	clearLevel() {
		this.clearEntities();
	}

	setup() {
		this.level = this.level;
		this.deaths = this.deaths;

		this.addSystem(ON_MOBILE ? new ECS.MobileInputSystem() : new ECS.InputSystem(canvas));
		//this.addSystem(new ECS.InputSystem(canvas));
		this.addSystem(new MovementSystem());
		this.addSystem(new CollisionSystem(quadtree));
		this.addSystem(new PhysicsSystem());
		this.addSystem(new SpawnSystem());
		this.addSystem(new ParticleSystem());
		this.addSystem(new AnimationSystem());
		this.addSystem(new CollectibleSystem());
		this.addSystem(new SpriteSystem());
		this.addSystem(new LightSystem(canvas));

		console.log("setup level:", this.level);
		Game.autoTiling(`assets/level-${this.level}.png`)
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
		if (dt > 1 / 30) dt = 1 / 30;

		if ((this.timer += dt) > 0.5) {
			this.timer = 0;
			fps.innerText = `${(1 / dt).toFixed(2)} FPS`;
		}

		if (!paused) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			//context.fillStyle = BACKGROUND_COLOR;
			//context.fillStyle = "#0F022E";
			context.fillStyle = "#170e2e";
			context.fillRect(0, 0, canvas.width, canvas.height);

			this.shake.update(dt);

			this.update({
				dt,
				canvas,
				context,
				ecs: this,
				game: this,
				sound: this.sound,
				shaker: this.shake,
			});

			/**
			 * Render UI
			 */

			context.drawImage(
				SPRITESHEET,
				6 * TILESIZE,
				1 * TILESIZE,
				TILESIZE,
				TILESIZE,
				TILESIZE,
				TILESIZE,
				TILESIZE,
				TILESIZE
			);

			// deaths
			this.numbers.renderNumber(context, 2 * TILESIZE, TILESIZE, this.deaths);

			context.drawImage(
				SPRITESHEET,
				7 * TILESIZE,
				1 * TILESIZE,
				13,
				TILESIZE,
				36 * TILESIZE - 7,
				TILESIZE,
				13,
				TILESIZE
			);

			// level
			this.numbers.renderNumber(context, 37 * TILESIZE, TILESIZE, this.level);

			// export to png
			if (this.recording && (this.frameTimer += dt) >= 1 / 30) {
				if (this.frame == 0) console.log("[Capture] starting from zero");
				this.frameTimer = 0;
				this.frame = (this.frame + 1) % 400; // max frames to store
				localStorage.setItem(this.frame.toString(), canvas.toDataURL("image/png"));
			}
		}

		requestAnimationFrame(this.animateBind);
	}
}

const game = new Game();
game.setup();

document.addEventListener("keydown", (e) => {
	switch (e.code) {
		case "KeyP": {
			paused = !paused;
			break;
		}

		case "KeyT": {
			localStorage.clear();
			location.reload();
			break;
		}

		case "KeyU": {
			game.recording = !game.recording;
			console.log("recording", game.recording);
			break;
		}

		case "KeyM": {
			game.level++;
			location.reload();
			break;
		}

		case "KeyN": {
			game.level--;
			location.reload();
			break;
		}
	}
});

document.ontouchstart = () => {
	if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch((e) => console.log(e));
};

canvas.ontouchstart = () => {
	screen.orientation.lock("landscape").catch((e) => console.log(e));
};
