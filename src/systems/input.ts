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
		const input = entity.getComponent(Input) as Input;

		input.mouse = { ...this.mouse };
		input.mouseX = this.mouseX;
		input.mouseY = this.mouseY;

		input.lastX = this.lastX;
		input.lastY = this.lastY;
	}
}

class MobileInputSystem extends System {
	visible: boolean = false;
	touch_start: Vector = new Vector(50, 150);
	touch_move: Vector = new Vector(50, 150);
	joystick_base: HTMLElement;
	joystick_top: HTMLElement;

	constructor() {
		super([Input, Player]);

		const initialTouch = (e: TouchEvent) => {
			e.preventDefault();
			const touch = e.touches[0];
			/*
			const x = touch.clientX - left_control_bb.left;
			const y = touch.clientY - left_control_bb.top;
			const width = virtual_joystick.offsetWidth;
			const height = virtual_joystick.offsetHeight;
			*/

			const x = touch.clientX;
			const y = touch.clientY;



			this.touch_start.set(x, y);
			this.touch_move.set(x, y);
		};

		const max_radius = 90;

		const handleTouch = (e: TouchEvent) => {
			e.preventDefault();

			const touch = e.touches[0];
			const x = touch.clientX;
			const y = touch.clientY;
			//const x = touch.clientX - left_control_bb.left;
			//const y = touch.clientY - left_control_bb.top;
			//const width = virtual_joystick.offsetWidth;
			//const height = virtual_joystick.offsetHeight;

			let vec = new Vector(x - this.touch_start.x, y - this.touch_start.y);
			let mag = vec.magnitude();
			vec.normalize();
			vec.scalarMult(Math.min(mag, max_radius));
			this.touch_move.set(this.touch_start.x + vec.x, this.touch_start.y + vec.y);

			JOYSTICK.x = (this.touch_move.x - this.touch_start.x) / max_radius;
			JOYSTICK.y = (this.touch_move.y - this.touch_start.y) / max_radius;
		};

		const virtual_joystick = document.querySelector("#button-0") as HTMLElement;
		this.joystick_base = document.querySelector("#base") as HTMLElement;
		this.joystick_top = document.querySelector("#top") as HTMLElement;

		const left_control_bb = virtual_joystick.getBoundingClientRect();

		virtual_joystick.addEventListener("touchstart", initialTouch);
		virtual_joystick.addEventListener("touchmove", handleTouch);
		virtual_joystick.addEventListener("touchend", (e) => {
			e.preventDefault();
			console.log("touchend");
			this.touch_move.set(this.touch_start.x, this.touch_start.y);
			JOYSTICK.set(0, 0);
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
		const button_2 = document.querySelector("#button-2") as HTMLElement;
		button_2.style.display = "flex";
		button_2.addEventListener("touchstart", () => {});
		button_2.addEventListener("touchend", () => {});
		*/
	}

	beforeAll(entities: Entity[], params: UpdateParams): void {
		this.joystick_base.style.left = `${this.touch_start.x - this.joystick_base.offsetWidth / 2}px`;
		this.joystick_base.style.top = `${this.touch_start.y - this.joystick_base.offsetHeight / 2}px`;

		this.joystick_top.style.left = `${this.touch_move.x - this.joystick_top.offsetWidth / 2}px`;
		this.joystick_top.style.top = `${this.touch_move.y - this.joystick_top.offsetHeight / 2}px`;

		console.log(JOYSTICK.x.toFixed(2), JOYSTICK.y.toFixed(2));
	}

	updateEntity(entity: Entity, params: UpdateParams): void {}
}

export { Input, InputSystem, MobileInputSystem, MouseButton };
