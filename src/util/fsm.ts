class State {
	name: string;
	previous: State | undefined;

	constructor(name: string) {
		this.name = name;
	}

	exit() {}

	enter() {}
}

class ElementState extends State {
	el: HTMLElement | null;
	visible: string;
	constructor(name: string, selector: string, visible: string = "block") {
		super(name);
		this.visible = visible;
		this.el = document.querySelector(selector);
	}

	enter() {
		if (this.el) this.el.style.display = this.visible;
	}

	exit() {
		if (this.el) this.el.style.display = "none";
	}
}

class FiniteStateMachine {
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

		state.previous = previous;
		state.enter();
		this.current = state;
	}

	setPreviousState() {
		let current = this.current;
		if (!current) throw new Error("No current state!");
		let previous = current.previous;
		if (!previous) throw new Error("No previous state!");
		this.setState(previous.name);
	}
}

export { State, FiniteStateMachine, ElementState };
