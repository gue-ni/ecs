import { Component } from "../component";
import { System } from "../system";
import { Entity } from "../entity";
import { UpdateParams } from "../ecs";
import { Player } from "./basic";

type MouseButton = "left" | "right" | "middle";

const KEY_DOWN: any = {};
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

	is_key_pressed(key: string, params: { delay?: number; reset?: boolean }): boolean {
		if (KEY_DOWN[key]) {
			if (!params.delay) return true;

			if (LAST_PRESSED[key] == undefined || Date.now() - LAST_PRESSED[key] > params.delay) {
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

			KEY_DOWN[e.code] = true;
		});

		window.addEventListener("keyup", (e) => {
			delete KEY_DOWN[e.code];
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

export { Input, InputSystem, MouseButton };
