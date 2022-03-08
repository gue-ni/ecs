import * as ECS from "../../lib";

export class Ai extends ECS.Component {

}

export class AiSystem extends ECS.System {
  constructor(){
    super([Ai])
  }

  updateEntity(entity: ECS.Entity, params: ECS.UpdateParams): void {
      
  }
}

