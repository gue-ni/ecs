import { Component } from "../component";
import { System } from "../system";
import { Entity } from "../entity";
import { UpdateParams } from "../ecs";
import { Player } from "./basic";

type MouseButton = "left" | "right" | "middle";

class Input extends Component {
	pressed: any;
	last_pressed: any;

	keydown: any = {};
	keyup: any = {};
	last_keydown: any = {};
	last_keyup: any = {};
	time_since_last_keydown: any = {};

	mouse: any;
	mouse_last_pressed: any;

	lastX: number = 0;
	lastY: number = 0;

	mouseY: number = 0;
	mouseX: number = 0;

	constructor() {
		super();
		this.pressed = {};
		this.last_pressed = {};

		this.mouse = {};
		this.mouse_last_pressed = {};
	}

	is_key_pressed(key: string, delay?: number): boolean {
		if (this.pressed[key]) {
			if (!delay || !this.last_pressed[key] || Date.now() - this.last_pressed[key] > delay) {
				this.last_pressed[key] = Date.now();
				return true;
			}
		}
		return false;
	}

	is_double_pressed(key: string, time_between: number): boolean {
		if (this.keydown[key] && this.last_keyup[key]) {
			if (this.last_keyup[key] < this.last_keydown[key] - this.time_since_last_keydown[key]) {
				return false;
			}

			if (this.time_since_last_keydown[key] && this.time_since_last_keydown[key] < time_between) {
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
	keys: any;
	mouse: any;

	keydown: any = {};
	keyup: any = {};
	last_keydown: any = {};
	last_keyup: any = {};
	time_since_last_keydown: any = {};

	lastX: number = 0;
	lastY: number = 0;

	mouseX: number = 0;
	mouseY: number = 0;

	constructor(canvas: HTMLCanvasElement) {
		super([Input, Player]);

		this.keys = {};
		this.mouse = {};

		window.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;
			this.keydown[e.code] = true;
			const now = Date.now();
			const last = this.last_keydown[e.code] ?? now;
			this.time_since_last_keydown[e.code] = now - last;
			this.last_keydown[e.code] = now;
		});

		window.addEventListener("keyup", (e) => {
			delete this.keys[e.code];
			this.keyup[e.code] = true;

			const now = Date.now();
			const last = this.last_keyup[e.code] ?? now;
			this.last_keyup[e.code] = now;
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

		input.pressed = { ...this.keys };
		input.last_keydown = { ...this.last_keydown };
		input.last_keyup = { ...this.last_keyup };
		input.time_since_last_keydown = { ...this.time_since_last_keydown };
		input.keydown = { ...this.keydown };
		input.keyup = { ...this.keyup };

		input.lastX = this.lastX;
		input.lastY = this.lastY;

		this.keydown = {};
	}
}

export { Input, InputSystem, MouseButton };
