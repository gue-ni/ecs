# lofi-ecs

A minimal entity-component-system.

```JavaScript
import * as ECS from "lofi-ecs";

class Velocity extends ECS.Component {
	x: number;
	y: number;

	constructor(x, y) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Coordinates extends ECS.Component {
	x: number;
	y: number;

	constructor(x, y) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Physics extends ECS.System {
	constructor() {
		super([Coordinates, Velocity]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: UpdateParams): void {
		const [coords] = entity.getComponent(Coordinates) as Coordinates;
		const [velocity] = entity.getComponent(Velocity) as Velocity;
	}
}

const ecs = new ECS.ECS();

ecs.addSystem(new Physics());

const entity = new ECS.Entity();
entity.addComponent(new Velocity(0, 1));
entity.addComponent(new Coordinates(0, 0));
ecs.addEntity(entity);

let dt: number = 0;
let then: number = 0;
function animate(now: number) {
	now *= 0.001;
	dt = now - then;
	then = now;
	ecs.update({ dt });
	requestAnimationFrame(animate);
}


```
