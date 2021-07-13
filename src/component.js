class Component {
	constructor(entity) {
		this.entity = entity;
	}

	get name() {
		return this.constructor.name;
	}

	destroy() {}
}

export { Component };
