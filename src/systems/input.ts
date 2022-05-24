import { Component } from "../component";
import { System } from "../system";
import { Entity } from "../entity";
import { UpdateParams } from "../ecs";
import { Player } from "./basic";

type MouseButton = "left" | "right" | "middle";

const KEYS: any = {};
const RESET: any = {};
const LAST_PRESSED: any = {};

class Input extends Component {
	mouse: any;
	mouse_last_pressed: any;

	lastX: number = 0;
	lastY: number = 0;

	mouseY: number = 0;
	mouseX: number = 0;

	constructor() {
		super();

		this.mouse = {};
		this.mouse_last_pressed = {};
	}

	disable_until_reset(key: string) {
		RESET[key] = false;
	}

	/**
	 * 
	 * @param key key to check
	 * @param delay does not return true if last pressed less than delay ago
	 * @param wait_for_reset does not return true if key was not released since last press
	 * @returns 
	 */
	is_key_pressed(key: string, delay?: number, wait_for_reset?: boolean): boolean {
		if (KEYS[key]) {
			if (wait_for_reset && !RESET[key]) {
				return false;
			}

			if (!delay) return true;

			if (LAST_PRESSED[key] == undefined || Date.now() - LAST_PRESSED[key] > delay) {
				LAST_PRESSED[key] = Date.now();
				return true;
			}
		}
		return false;
	}

	is_mouse_pressed(side: MouseButton, delay?: number): boolean {
		if (this.mouse[side]) {
			if (!delay || !this.mouse_last_pressed[side] || Date.now() - this.mouse_last_pressed[side] > delay) {
				this.mouse_last_pressed[side] = Date.now();
				return true;
			}
		}
		return false;
	}
}

class InputSystem extends System {
	//keys: any;
	mouse: any;

	locked: any = {};

	lastX: number = 0;
	lastY: number = 0;

	mouseX: number = 0;
	mouseY: number = 0;

	constructor(canvas: HTMLCanvasElement) {
		super([Input, Player]);

		this.mouse = {};

		window.addEventListener("keydown", (e) => {
			if (e.repeat) return;
			KEYS[e.code] = true;
		});

		window.addEventListener("keyup", (e) => {
			delete KEYS[e.code];
			RESET[e.code] = true;
		});

		canvas.addEventListener("mousedown", (e) => {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			this.lastX = Math.round((e.clientX - rect.left) * scaleX);
			this.lastY = Math.round((e.clientY - rect.top) * scaleY);

			if (e.button == 0) {
				this.mouse["left"] = true;
			} else if (e.button == 2) {
				this.mouse["right"] = true;
			} else if (e.button == 4) {
				this.mouse["middle"] = true;
			}
		});

		canvas.addEventListener("mouseup", (e) => {
			if (e.button == 0) {
				this.mouse["left"] = false;
			} else if (e.button == 2) {
				this.mouse["right"] = false;
			} else if (e.button == 4) {
				this.mouse["middle"] = false;
			}
		});

		canvas.addEventListener("contextmenu", (e) => e.preventDefault());

		canvas.addEventListener("mousemove", (e) => {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			this.mouseX = Math.round((e.clientX - rect.left) * scaleX);
			this.mouseY = Math.round((e.clientY - rect.top) * scaleY);
		});
	}

	updateEntity(entity: Entity, params: UpdateParams): void {
		const input = entity.getComponent(Input) as Input;

		input.mouse = { ...this.mouse };
		input.mouseX = this.mouseX;
		input.mouseY = this.mouseY;

		input.lastX = this.lastX;
		input.lastY = this.lastY;
	}
}

class MobileInputSystem extends System {
	constructor() {
		super([Input, Player]);

		const handleTouch = (e: TouchEvent) => {
			const touch = e.touches[0];
			const x = touch.clientX - left_control_bb.left;
			const y = touch.clientY - left_control_bb.top;
			const width = button_0.offsetWidth;
			const height = button_0.offsetHeight;

			//console.log({ x, y, width, height });

			if (x < width / 2) {
				//console.log("left");
				KEYS["ArrowLeft"] = true;
				delete KEYS["ArrowRight"];
			} else if (x > width / 2) {
				//console.log("right");
				delete KEYS["ArrowLeft"];
				KEYS["ArrowRight"] = true;
			}

			/*
			if (y < height / 2) {
				//console.log("up");
				KEYS["ArrowUp"] = true;
				delete KEYS["ArrowDown"];
			} else if (y > height / 2) {
				//console.log("down");
				delete KEYS["ArrowUp"];
				KEYS["ArrowDown"] = true;
			}
			*/
		};

		const button_0 = document.querySelector("#button-0") as HTMLElement;
		const left_control_bb = button_0.getBoundingClientRect();
		//left_control.style.display = "flex";

		console.log({ left_control: button_0 });

		button_0.addEventListener("touchmove", handleTouch);
		button_0.addEventListener("touchstart", handleTouch);
		button_0.addEventListener("touchend", () => {
			delete KEYS["ArrowRight"];
			delete KEYS["ArrowLeft"];
			delete KEYS["ArrowUp"];
			delete KEYS["ArrowDown"];
		});

		const button_1 = document.querySelector("#button-1") as HTMLElement;
		button_1.addEventListener("touchstart", () => {
			console.log("button-1");
			KEYS["KeyC"] = true;
		});
		button_1.addEventListener("touchend", () => {
			delete KEYS["KeyC"];
		});

		const button_2 = document.querySelector("#button-2") as HTMLElement;
		button_2.addEventListener("touchstart", () => {
			console.log("button-2");
			KEYS["KeyV"] = true;
		});
		button_2.addEventListener("touchend", () => {
			delete KEYS["KeyV"];
		});

		/*
		const button_1 = document.querySelector("#button-1") as HTMLElement;
		button_1.style.display = "flex";
		button_1.addEventListener("touchstart", () => {});
		button_1.addEventListener("touchend", () => {});

		const button_2 = document.querySelector("#button-2") as HTMLElement;
		button_2.style.display = "flex";
		button_2.addEventListener("touchstart", () => {});
		button_2.addEventListener("touchend", () => {});
		*/
	}

	updateEntity(entity: Entity, params: UpdateParams): void {}
}

export { Input, InputSystem, MobileInputSystem, MouseButton };
