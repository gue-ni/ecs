// core
export { ECS, UpdateParams } from "./ecs";
export { System } from "./system";
export { Entity, EntityID } from "./entity";
export { Component, ComponentConstructor, getComponentType } from "./component";

// utils
export { Vector } from "./util/vector";
export { QuadTree } from "./util/quadtree";
export { randomFloat, randomInteger, clamp, lerp, approach } from "./util/index";
export { State, ElementState, FiniteStateMachine } from "./util/fsm";
export {
	AABB,
	Rectangle,
	ColliderType,
	CollisionEvent,
	RectVsRect,
	PointVsRect,
	RayVsRect,
	DynamicRectVsRect,
} from "./util/collision";
export { Particle, ParticleEmitter, ParticleSystem } from "./util/particles";

// useful systems & components
export { Input, InputSystem, MouseButton } from "./systems/input";
export { Collider, CollisionSystem } from "./systems/collision";
export { Position, Velocity, Player, VectorComponent } from "./systems/basic";
