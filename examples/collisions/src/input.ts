import * as ECS from "../../../lib";

type MouseButton = "left" | "right";

export class Input extends ECS.Component {
	pressed: any;
	last_pressed: any;

	mouse: any;
	mouse_last_pressed: any;

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

export class InputSystem extends ECS.System {
	keys: any;
	mouse: any;

	mouseX: number;
	mouseY: number;

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
	}
}
