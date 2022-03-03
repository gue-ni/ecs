# lofi-ecs

A minimal entity-component-system.

```JavaScript
import * as ECS from "lofi-ecs";

// implement data components
class Velocity extends ECS.Component {
  constructor(x,y){
    super();
    this.x = x;
    this.y = y;
  }
}

class Coordinates extends ECS.Component {
  constructor(x,y){
    super();
    this.x = x;
    this.y = y;
  }
}

class Physics extends ECS.System {
  constructor(){
    super([Coordinates, Velocity]); // required components
  }

  updateEntity(entity, params){
    let vel = entity.getComponent(Velocity);
    let coords = entity.getComponent(Coordinates);
    // implement behaviour
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
