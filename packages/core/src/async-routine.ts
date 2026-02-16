import { INDEFINITELY, type EventReq, type RoutineEmitter } from "./yieldables.js";
import { AsyncRoutineNode } from "./async-routine-node.js";
import type { EventDefs, AllowedYield } from "./routine.js";

export type AsyncRoutine<T extends AsyncRoutineNode> = {
  run(root: T): Promise<void>;
};

export function asyncRoutine<T extends AsyncRoutineNode>(
  make: (root: T) => AsyncGenerator<any, void, any>,
): AsyncRoutine<T> {
  return {
    async run(root: T) {
      await root.child(() => make(root));
    },
  };
}

export type AsyncEventRoutine<
  T extends AsyncRoutineNode,
  Defs extends EventDefs,
> = {
  run(root: T): Promise<void>;
};

export function asyncEventRoutine<
  T extends AsyncRoutineNode,
  Defs extends EventDefs,
>(
  defs: Defs,
  make: (
    opts: unknown,
    ctx: Defs & { root: T },
  ) => AsyncGenerator<AllowedYield<Defs>, void, any>,
): AsyncEventRoutine<T, Defs> {
  return {
    async run(root: T) {
      await root.child(() => make(undefined, { ...(defs as any), root }) as any);
    },
  };
}
