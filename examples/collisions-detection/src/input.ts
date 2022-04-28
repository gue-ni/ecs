import * as ECS from "../../../lib";

type MouseButton = "left" | "right";

export class Input extends ECS.Component {
	pressed: any;
	last_pressed: any;

	mouse: any;
	mouse_last_pressed: any;

	lastX: number;
	lastY: number;

	mouseY: number;
	mouseX: number;

	doubleJumpAllowed: boolean = false;

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

	is_mouse_pressed(side: MouseButton, delay?: number): boolean {
		if (this.mouse[side]) {
			if (!delay || !this.mouse_last_pressed[side] || Date.now() - this.mouse_last_pressed[side] > delay) {
				this.mouse_last_pressed[side] = Date.now();
				return true;
			}
		} else {
			return false;
		}
	}
}

function toScreenCoord(x: number, y: number, canvas: HTMLCanvasElement) {
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	let xs = Math.round((x - rect.left) * scaleX);
	let ys = Math.round((y - rect.top) * scaleY);
	return [xs, ys];
}

export class InputSystem extends ECS.System {
	keys: any;
	mouse: any;

	lastX: number = 0;
	lastY: number = 0;

	mouseX: number = 0;
	mouseY: number = 0;

	constructor(canvas: HTMLCanvasElement) {
		super([Input]);

		this.keys = {};
		this.mouse = {};

		window.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;
		});

		window.addEventListener("keyup", (e) => {
			delete this.keys[e.code];
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
			}
		});

		canvas.addEventListener("mouseup", (e) => {
			if (e.button == 0) {
				this.mouse["left"] = false;
			} else if (e.button == 2) {
				this.mouse["right"] = false;
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

	updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
		const input = entity.getComponent(Input) as Input;

		input.pressed = { ...this.keys };
		input.mouse = { ...this.mouse };

		input.mouseX = this.mouseX;
		input.mouseY = this.mouseY;

		input.lastX = this.lastX;
		input.lastY = this.lastY;
	}
}
