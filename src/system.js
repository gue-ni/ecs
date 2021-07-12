class System {
    constructor(requiredComponents) {
        this.requiredComponents = requiredComponents;
    }

    matches(entity) {
        return true;
    }

    logic(entity, dt, params) {
        console.log("default logic");
    }

    update(ecs, dt, params) {
        for (const entity of ecs.entities) {
            if (!ecs.entitiesToRemove.has(entity) && this.matches(entity)) {
                this.logic(entity, dt, params);
            }
        }
    }
}

export { System };
