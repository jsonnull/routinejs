import { describe, it, expect } from "vitest";
import { INDEFINITELY, emitter, waitFor } from "../src/index.js";

describe("INDEFINITELY", () => {
  it("is a unique symbol", () => {
    expect(typeof INDEFINITELY).toBe("symbol");
    expect(INDEFINITELY.toString()).toContain("INDEFINITELY");
  });
});

describe("emitter()", () => {
  it("creates a RoutineEmitter with _subscribe method", () => {
    const e = emitter<number>((cb) => {
      return { [Symbol.dispose]() {} };
    });
    expect(typeof e._subscribe).toBe("function");
  });

  it("_subscribe receives callbacks and returns Disposable", () => {
    const listeners = new Set<(v: number) => void>();
    const e = emitter<number>((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const values: number[] = [];
    const sub = e._subscribe((v) => values.push(v));

    expect(listeners.size).toBe(1);
    for (const cb of listeners) cb(42);
    expect(values).toEqual([42]);

    sub[Symbol.dispose]();
    expect(listeners.size).toBe(0);
  });
});

describe("waitFor()", () => {
  it("returns the emitter cast as EventReq", () => {
    const e = emitter<string>((cb) => ({
      [Symbol.dispose]() {},
    }));
    const req = waitFor(e);
    // At runtime, req IS the emitter object (just type-cast)
    expect(req).toBe(e);
  });
});
