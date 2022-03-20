export class State {
	name: string;
	previous: State | undefined;

	constructor(name: string) {
		this.name = name;
	}

	exit() {}

	enter() {}
}

export class HTMLState extends State {
	el: HTMLElement | null;
	constructor(name: string, selector: string) {
		super(name);
		this.el = document.querySelector(selector);
	}

	enter(): void {
		if (this.el) this.el.style.display = "block";
	}

	exit(): void {
		if (this.el) this.el.style.display = "none";
	}
}

export class FiniteStateMachine {
	current: State | undefined;
	states: Map<string, State>;

	constructor() {
		this.states = new Map();
	}

	addState(state: State) {
		this.states.set(state.name, state);
	}

	setState(name: string) {
		if (name == this.current?.name) return;
		const previous = this.current;
		previous?.exit();
		const state = this.states.get(name);
		if (!state) throw new Error(`State "${name}" does not exist!`);
		this.current = state;
		this.current.previous = previous;
		this.current.enter();
	}

	setPreviousState() {
		let current = this.current;
		if (!current) throw new Error("No current state!");
		let previous = current.previous;
		if (!previous) throw new Error("No previous state!");
		this.setState(previous.name);
	}
}
