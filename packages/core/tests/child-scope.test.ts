import { describe, it, expect } from "vitest";
import { ChildScope, INDEFINITELY, eventable, waitFor } from "../src/index.js";
import type { ControllerGen } from "../src/index.js";

describe("ChildScope", () => {
  it("constructor starts the generator immediately", () => {
    const log: string[] = [];

    const scope = new ChildScope(function* (): ControllerGen {
      log.push("started");
      yield INDEFINITELY;
    });

    expect(log).toEqual(["started"]);
  });

  it("dispose() stops the generator and sets disposed flag", () => {
    const log: string[] = [];

    const scope = new ChildScope(function* (): ControllerGen {
      try {
        log.push("started");
        yield INDEFINITELY;
        log.push("after-indefinitely"); // should never run
      } finally {
        log.push("finally");
      }
    });

    expect(scope.disposed).toBe(false);
    scope[Symbol.dispose]();
    expect(scope.disposed).toBe(true);
    expect(log).toContain("finally");
    expect(log).not.toContain("after-indefinitely");
  });

  it("dispose() is idempotent", () => {
    let disposeCount = 0;

    const scope = new ChildScope(function* (): ControllerGen {
      try {
        yield INDEFINITELY;
      } finally {
        disposeCount++;
      }
    });

    scope[Symbol.dispose]();
    scope[Symbol.dispose]();
    // Should only run finally once
    expect(disposeCount).toBe(1);
  });

  it("resume() is no-op after dispose", () => {
    const log: string[] = [];
    const listeners = new Set<(v: number) => void>();
    const e = eventable<number>((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const scope = new ChildScope(function* (): ControllerGen {
      const v = yield waitFor(e);
      log.push(`got: ${v}`);
    });

    scope[Symbol.dispose]();
    // resume after dispose should be no-op
    scope.resume(42);
    expect(log).toEqual([]);
  });

  it("generator that completes without yielding sets up cleanly", () => {
    const log: string[] = [];

    const scope = new ChildScope(function* (): ControllerGen {
      log.push("done");
    });

    expect(log).toEqual(["done"]);
    // Disposing should be safe even though generator already completed
    scope[Symbol.dispose]();
  });
});
