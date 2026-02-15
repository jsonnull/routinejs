import { INDEFINITELY, type EventReq, type Eventable } from "./yieldables.js";
import { Controllable } from "./controllable.js";

export type Routine<T extends Controllable> = {
  run(root: T): void;
};

export function controller<T extends Controllable>(
  make: (root: T) => Generator<any, void, any>,
): Routine<T> {
  return {
    run(root: T) {
      root.child(() => make(root));
    },
  };
}

export type EventDefs = Record<string, Eventable<any>>;

type EventPayload<E> = E extends Eventable<infer T> ? T : never;
type EventUnion<Defs extends EventDefs> = EventPayload<Defs[keyof Defs]>;

export type AllowedYield<Defs extends EventDefs> =
  | typeof INDEFINITELY
  | EventReq<EventUnion<Defs>>;

export type EventRoutine<T extends Controllable, Defs extends EventDefs> = {
  run(root: T): void;
};

export function eventController<
  T extends Controllable,
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
