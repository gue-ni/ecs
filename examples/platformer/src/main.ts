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
	TileSystem,
	ParallaxSystem,
	FragilePlatformSystem,
	CameraSystem,
} from "./systems";
import { loadLevelFromImage } from "./tiling";

export const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
export const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const ON_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (ON_MOBILE && !window.location.href.includes("mobile.html")) {
	window.location.href = "mobile.html";
}

export const FOREGROUND_COLOR = "#ffffff";
export const BACKGROUND_COLOR = "#170e2e";
export const TILESIZE = 8;

let paused = true;
export const SPRITESHEET = new Image();
SPRITESHEET.src = "assets/spritesheet.png";
SPRITESHEET.onload = () => (paused = false);

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
	x: ECS.pixels = 0;
	y: ECS.pixels = 0;

	magnitude: ECS.pixels = 3;
	private static duration: ECS.seconds = 0.25;
	private time: ECS.seconds = 0;

	update(dt: number) {
		if ((this.time -= dt) > 0) {
			this.x = ECS.randomFloat(-this.magnitude, this.magnitude);
			this.y = ECS.randomFloat(-this.magnitude, this.magnitude);
		} else {
			this.x = 0;
			this.y = 0;
		}
	}

	shake(mag: ECS.pixels = 3) {
		this.time = Shake.duration;
		this.magnitude = mag;
	}
}

export class Game extends ECS.ECS {
	level_num: number = 24;
	data: any;

	private FPS: string = "0";
	private then: number = 0;
	private timer: number = 0;

	shake: Shake = new Shake();
	sound: Sound = new Sound();
	cameraOffset = new ECS.Vector();
	numbers: NumberRenderer = new NumberRenderer({
		spritesheet: SPRITESHEET,
		offset: new ECS.Vector(6 * TILESIZE, 0),
	});

	recording: boolean = false;
	private frame: number = 0;
	private frameTimer: number = 0;

	createLevel(player_pos?: ECS.Vector, player_vel?: ECS.Vector) {
		const biome = Math.floor(this.level / 10);
		for (const { x, y, type, side } of this.data) {
			const pos = new ECS.Vector(x * TILESIZE, y * TILESIZE);

			switch (type) {
				case "player": {
					this.addEntity(Factory.createPlayer(player_pos || pos, player_vel));
					break;
				}

				case "fragile": {
					this.addEntity(Factory.createFragile(pos));
					break;
				}

				case "tile": {
					this.addEntity(Factory.createTile(pos, side, biome));

					break;
				}

				case "dash": {
					this.addEntity(Factory.createCoin(pos));
					break;
				}

				case "bounce": {
					this.addEntity(Factory.createTrampoline(pos));
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

				case null: {
					break;
				}
			}
		}
	}

	clearLevel() {
		this.clearEntities();
	}

	canvas_coordinates(pos: ECS.IVector) {
		return new ECS.Vector(
			pos.x + this.shake.x + this.cameraOffset.x,
			pos.y + this.shake.y + this.cameraOffset.y
		).round();
	}

	async setup() {
		this.level = this.level;
		this.deaths = this.deaths;

		fetch(`assets/info.json`)
			.then((res) => res.json())
			.then((info) => {
				console.log({ info });

				const version = localStorage.getItem("version");
				if (version != info.version) {
					console.log("new version", info.version, version);
					localStorage.setItem("version", info.version);

					for (let i = 0; i < Math.ceil(this.level_num / 10); i++) {
						let filename = `assets/levels-${i}.png`;
						console.log("invalidate", filename);
						localStorage.removeItem(filename);
					}
				}

				const parallax = new ParallaxSystem([
					{
						image: SPRITESHEET,
						origin: new ECS.Vector(40 * TILESIZE, 0),
						size: new ECS.Vector(320, 130),
						depth: 0.95,
					},
					{
						image: SPRITESHEET,
						origin: new ECS.Vector(40 * TILESIZE, 130),
						size: new ECS.Vector(320, 180),
						depth: 0.55,
					},

					{
						image: SPRITESHEET,
						origin: new ECS.Vector(120 * TILESIZE, 0),
						size: new ECS.Vector(320, 120),
						depth: 0.5,
					},

					{
						image: SPRITESHEET,
						origin: new ECS.Vector(80 * TILESIZE, 0),
						size: new ECS.Vector(320, 120),
						depth: 0.25,
					},
				]);

				this.addSystems([
					ON_MOBILE ? new ECS.MobileInputSystem() : new ECS.InputSystem(canvas),
					new MovementSystem(),
					new CollisionSystem(quadtree),
					new PhysicsSystem(),
					new SpawnSystem(),
					new FragilePlatformSystem(),
					new AnimationSystem(),
					new CollectibleSystem(),
					new TileSystem(canvas),
					new ParticleSystem(),
					new SpriteSystem(),
					//new LightSystem(canvas),
				]);

				if (ON_MOBILE) {
					this.addSystem(new CameraSystem(this.cameraOffset));
				}

				loadLevelFromImage(this.level)
					.then((json) => {
						this.data = json;
						this.createLevel();
						this.animate(0);
					})
					.catch((e) => {
						console.log("failed to load level", e);
					});
			})
			.catch((e) => {
				console.log(e);
			});
	}

	animate(now: ECS.seconds) {
		now *= 0.001;
		let dt: ECS.seconds = now - this.then;
		this.then = now;
		if (dt > 1 / 30) dt = 1 / 30;

		if (!paused) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.fillStyle = BACKGROUND_COLOR;
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

			// little skull
			context.drawImage(
				SPRITESHEET,
				6 * TILESIZE,
				1 * TILESIZE,
				TILESIZE,
				TILESIZE,
				TILESIZE - 2,
				TILESIZE,
				TILESIZE,
				TILESIZE
			);

			// deaths
			this.numbers.renderNumber(context, 2 * TILESIZE, TILESIZE, this.deaths);

			// lvl
			context.drawImage(
				SPRITESHEET,
				4 * TILESIZE,
				1 * TILESIZE,
				13,
				TILESIZE,
				36 * TILESIZE - 7,
				TILESIZE,
				13,
				TILESIZE
			);

			// level number
			this.numbers.renderNumber(context, 37 * TILESIZE, TILESIZE, this.level);

			// fps
			if ((this.timer += dt) > 0.5) {
				this.timer = 0;
				this.FPS = (1 / dt).toFixed(2);
			}
			this.numbers.renderNumber(context, 36 * TILESIZE, 21 * TILESIZE, parseFloat(this.FPS));

			// export to png
			if (this.recording && (this.frameTimer += dt) >= 1 / 30) {
				if (this.frame == 0) console.log("[Capture] starting from zero");
				this.frameTimer = 0;
				this.frame = (this.frame + 1) % 400; // max frames to store
				localStorage.setItem(this.frame.toString(), canvas.toDataURL("image/png"));
			}
		}

		requestAnimationFrame(this.animate.bind(this));
	}

	get deaths() {
		return parseInt(localStorage.getItem("deaths")) || 0;
	}

	set deaths(x: number) {
		localStorage.setItem("deaths", x.toString());
	}

	get level() {
		return parseInt(localStorage.getItem("level")) || 0;
	}

	set level(x: number) {
		if (x > this.level_num - 1 || x < 0) return;
		localStorage.setItem("level", x.toString());
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


if (ON_MOBILE){
	const pause = document.querySelector('#pause') as HTMLElement;
	const menu = document.querySelector('#menu') as HTMLElement;
	const continue_game = document.querySelector('#continue-game') as HTMLElement;
	const reset_game = document.querySelector('#reset-game') as HTMLElement;

	continue_game.onclick = () => {
		menu.style.visibility = "hidden"
		paused = !paused
	}
	pause.onclick = () => {
		menu.style.visibility = "visible"
		paused = !paused
	}
	reset_game.onclick = () => {
		localStorage.clear();
		location.reload()
	}
}

document.ontouchstart = () => {
	if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch((e) => console.log(e));
};

canvas.ontouchstart = () => {
	screen.orientation.lock("landscape").catch((e) => console.log(e));
};
