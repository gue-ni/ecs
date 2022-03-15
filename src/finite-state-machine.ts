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
	constructor(name: string, selector: string){
		super(name)
		this.el = document.querySelector(selector)
	}

	enter(): void {
		if (this.el) this.el.style.display = "block"	
	}

	exit(): void {
		if (this.el) this.el.style.display = "none"	
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
		const previous = this.current;
		previous?.exit();
		this.current = this.states.get(name)!;
		this.current.previous = previous;
		this.current.enter();
	}
}
