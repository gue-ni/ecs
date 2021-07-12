class System {
    constructor(requiredComponents) {
        this.requiredComponents = requiredComponents;
    }

    update(dt, params) {}
}

class SystemManager {
    constructor() {
        this.systems = [];
    }

    addSystem(system) {
        this.systems.push(system);
    }

    setSystems(systems) {
        this.systems = systems;
    }

    update(dt, params) {
        for (let system of systems) {
            system.update(dt, params);
        }
    }
}

export { System, SystemManager };
