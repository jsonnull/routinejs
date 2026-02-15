export const INDEFINITELY: unique symbol = Symbol("INDEFINITELY") as any;

declare const EVENT_REQ: unique symbol;

/** Yield token: "wait for one event of type T" */
export type EventReq<T> = { readonly [EVENT_REQ]: T };

/** Event source adapter (runtime subscribes, resumes generator on first event) */
export type Eventable<T> = {
  _subscribe(cb: (ev: T) => void): Disposable;
};

/** Create an Eventable from a subscribe function. */
export function eventable<T>(
  subscribe: (cb: (ev: T) => void) => Disposable,
): Eventable<T> {
  return { _subscribe: subscribe };
}

/** Create a typed request token; yield this to receive a single event payload. */
export function waitFor<T>(e: Eventable<T>): EventReq<T> {
  return e as unknown as EventReq<T>;
}

export type Yieldable = typeof INDEFINITELY | EventReq<any>;

/** A controller generator. */
export type ControllerGen = Generator<Yieldable, void, any>;
