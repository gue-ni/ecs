import { Component } from "../component";
import { System } from "../system";
import { Entity } from "../entity";
import { UpdateParams } from "../ecs";
import { Player } from "./basic";
import { Vector } from "../util/vector";

type MouseButton = "left" | "right" | "middle";

const KEYS: any = {};
const DISABLED: any = {};
const LAST_PRESSED: any = {};

const JOYSTICK: Vector = new Vector();

const d_pad = new Vector();

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

	get joystick_x() {
		return JOYSTICK.x;
	}

	get joystick_y() {
		return JOYSTICK.y;
	}

	disable_until_key_release(key: string) {
		DISABLED[key] = true;
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
			if (wait_for_reset && DISABLED[key]) {
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

	is_down(key: string){
		return KEYS[key]
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

class Joystick extends Component {
	get x() {
		return d_pad.x;
	}

	get y() {
		return d_pad.y;
	}
}

export class JoystickSystem extends System {
	constructor(params: { left: string; right: string; up: string; down: string }) {
		super([Joystick]);

		window.addEventListener("keydown", (e) => {
			if (e.code == params.left) {
				d_pad.x = -1;
			} else if (e.code == params.right) {
				d_pad.x = +1;
			} else {
				d_pad.x = 0;
			}

			if (e.code == params.up) {
				d_pad.y = -1;
			} else if (e.code == params.down) {
				d_pad.y = +1;
			} else {
				d_pad.y = 0;
			}
		});

		window.addEventListener("keyup", (e) => {
			delete KEYS[e.code];
			DISABLED[e.code] = false;
		});
	}

	updateEntity(entity: Entity, params: UpdateParams): void {}
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
			DISABLED[e.code] = false;
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
		const input = entity.getComponent<Input>(Input); 

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

		for (let arrow of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"]) {
			const button = document.querySelector(`#${arrow}`) as HTMLElement;
			button.ontouchstart = () => {
				KEYS[arrow] = true;
			};
			button.ontouchend = () => {
				delete KEYS[arrow];
			};
		}

		const jump = document.querySelector("#jump") as HTMLElement;
		jump.ontouchstart = () => {
			KEYS["KeyC"] = true;
		};
		jump.ontouchend = () => {
			delete KEYS["KeyC"];
			DISABLED["KeyC"] = false;
		};
	}

	updateEntity(entity: Entity, params: UpdateParams): void {}
}

export { Input, InputSystem, MobileInputSystem, MouseButton };
