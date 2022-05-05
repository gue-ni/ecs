# ECS - Entity Component System

A simple entity-component-system for HTML5 games. 

## TODO

*	improve design
* add collision system

## Usage

```JavaScript
import * as ECS from "./ecs.min.js"
```

or


```TypeScript
import * as ECS from "lofi-ecs";

class Velocity extends ECS.Component {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}
}

class Position extends ECS.Component {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		super();
		this.x = x;
		this.y = y;
	}
}

class PhysicsSystem extends ECS.System {
	constructor() {
		super([Coordinates, Velocity]); // necessary Components
	}

	updateEntity(entity: ECS.Entity, params: UpdateParams): void {
		const position = entity.getComponent(Position) as Position;
		const velocity = entity.getComponent(Velocity) as Velocity;
		// implement logic here
	}
}

const ecs = new ECS.ECS();

ecs.addSystem(new PhysicsSystem());

const entity = new ECS.Entity();
entity.addComponent(new Velocity(0, 1));
entity.addComponent(new Position(0, 0));
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
