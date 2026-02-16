import { INDEFINITELY, type EventReq, type RoutineEmitter } from "./yieldables.js";
import { RoutineNode } from "./routine-node.js";

export type Routine<T extends RoutineNode> = {
  run(root: T): void;
};

export function routine<T extends RoutineNode>(
  make: (root: T) => Generator<any, void, any>,
): Routine<T> {
  return {
    run(root: T) {
      root.child(() => make(root));
    },
  };
}

export type EventDefs = Record<string, RoutineEmitter<any>>;

type EventPayload<E> = E extends RoutineEmitter<infer T> ? T : never;
type EventUnion<Defs extends EventDefs> = EventPayload<Defs[keyof Defs]>;

export type AllowedYield<Defs extends EventDefs> =
  | typeof INDEFINITELY
  | EventReq<EventUnion<Defs>>;

export type EventRoutine<T extends RoutineNode, Defs extends EventDefs> = {
  run(root: T): void;
};

export function eventRoutine<
  T extends RoutineNode,
  Defs extends EventDefs,
>(
  defs: Defs,
  make: (
    opts: unknown,
    ctx: Defs & { root: T },
  ) => Generator<AllowedYield<Defs>, void, any>,
): EventRoutine<T, Defs> {
  return {
    run(root: T) {
      root.child(() => make(undefined, { ...(defs as any), root }) as any);
    },
  };
}
