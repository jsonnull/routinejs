export const INDEFINITELY: unique symbol = Symbol("INDEFINITELY") as any;

declare const EVENT_REQ: unique symbol;

/** Yield token: "wait for one event of type T" */
export type EventReq<T> = { readonly [EVENT_REQ]: T };

/** Routine event emitter (runtime subscribes, resumes generator on first event) */
export type RoutineEmitter<T> = {
  _subscribe(cb: (ev: T) => void): Disposable;
};

/** Create a RoutineEmitter from a subscribe function. */
export function emitter<T>(
  subscribe: (cb: (ev: T) => void) => Disposable,
): RoutineEmitter<T> {
  return { _subscribe: subscribe };
}

/** Create a typed request token; yield this to receive a single event payload. */
export function waitFor<T>(e: RoutineEmitter<T>): EventReq<T> {
  return e as unknown as EventReq<T>;
}

export type Yieldable = typeof INDEFINITELY | EventReq<any>;

/** A routine generator. */
export type RoutineGen = Generator<Yieldable, void, any>;
