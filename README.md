# lofi-ecs

A minimal entity-component-system.

```JavaScript
import * as ECS from "lofi-ecs";

class Velocity extends ECS.Component { }

class Coordinates extends ECS.Component { }

class Physics extends ECS.System {
  constructor(){
    super([Coordinates, Velocity]); // necessary Components
  }
}

const ecs = new ECS.ECS();

ecs.addSystem(new Physics());

const entity = new ECS.Entity();
entity.addComponent(new Velocity());
entity.addComponent(new Coordinates());
ecs.addEntity(entity);

let dt: number = 0;
let then: number = 0;
function animate(now: number) {
  now *= 0.001;
  dt = now - then;
  then = now,
  ecs.update({ dt })
  requestAnimationFrame(animate);
}

```
