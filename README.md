# ECS - Entity Component System

A simple entity-component-system for HTML5 games.

## Example: a platformer inspired by _Celeste_

![](examples/platformer/assets/video.webp)

[Play Here!](https://www.jakobmaier.at/projects/ecs/platformer/?ref=github)

## Usage

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
		const position = entity.getComponent<Position>(Position); 
		const velocity = entity.getComponent<Velocity>(Velocity); 

		position.x = position.x + params.dt * velocity.x;
		position.y = position.y + params.dt * velocity.y;

		if (position.y < params.canvas.height) {
			velocity.y += params.dt * GRAVITY;
		}
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
