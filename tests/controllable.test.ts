import { describe, it, expect } from "vitest";
import { Controllable, INDEFINITELY } from "../src/index.js";
import type { ControllerGen } from "../src/index.js";

class TestControllable extends Controllable {}

describe("Controllable", () => {
  it("own() ties a disposable to the instance lifetime", () => {
    const ctrl = new TestControllable();
    let disposed = false;

    ctrl.own({
      [Symbol.dispose]() {
        disposed = true;
      },
    });

    expect(disposed).toBe(false);
    ctrl[Symbol.dispose]();
    expect(disposed).toBe(true);
  });

  it("own() handles null/undefined gracefully", () => {
    const ctrl = new TestControllable();
    const result = ctrl.own(null);
    expect(result).toBeNull();
    const result2 = ctrl.own(undefined);
    expect(result2).toBeUndefined();
    // Should not throw on dispose
    ctrl[Symbol.dispose]();
  });

  it("own() wraps AsyncDisposable with fire-and-forget", () => {
    const ctrl = new TestControllable();
    let asyncDisposed = false;

    ctrl.own({
      async [Symbol.asyncDispose]() {
        asyncDisposed = true;
      },
    });

    ctrl[Symbol.dispose]();
    // The async dispose is fire-and-forget, so it should have been triggered
    expect(asyncDisposed).toBe(true);
  });

  it("dispose() disposes all owned resources in LIFO order", () => {
    const ctrl = new TestControllable();
    const order: number[] = [];

    ctrl.own({ [Symbol.dispose]: () => order.push(1) });
    ctrl.own({ [Symbol.dispose]: () => order.push(2) });
    ctrl.own({ [Symbol.dispose]: () => order.push(3) });

    ctrl[Symbol.dispose]();
    // DisposableStack disposes in reverse order (LIFO)
    expect(order).toEqual([3, 2, 1]);
  });

  it("child() returns an auto-owned ChildScope", () => {
    const ctrl = new TestControllable();
    const log: string[] = [];

    const scope = ctrl.child(function* (): ControllerGen {
      log.push("started");
      yield INDEFINITELY;
      log.push("resumed"); // should not run
    });

    expect(log).toEqual(["started"]);
    expect(scope.disposed).toBe(false);

    // Disposing the controllable should dispose the child scope
    ctrl[Symbol.dispose]();
    expect(scope.disposed).toBe(true);
  });
});
