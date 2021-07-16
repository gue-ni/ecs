# lofi-ecs

A minimal entity-component-system.

```JavaScript
import * as ECS from "lofi-ecs";

const ecs = new ECS.ECS().addSystem(new ECS.System());

const entity = new ECS.Entity().addComponent(new ECS.Component());

ecs.addEntity(entity);

ecs.update(dt, {});
```
