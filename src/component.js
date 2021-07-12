class Component {
    constructor() {}

    get name() {
        return this.constructor.name;
    }

    destroy() {}
}

export { Component };
