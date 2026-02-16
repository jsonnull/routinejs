import { describe, it, expect } from "vitest";
import { INDEFINITELY, eventable, waitFor } from "../src/index.js";

describe("INDEFINITELY", () => {
  it("is a unique symbol", () => {
    expect(typeof INDEFINITELY).toBe("symbol");
    expect(INDEFINITELY.toString()).toContain("INDEFINITELY");
  });
});

describe("eventable()", () => {
  it("creates an Eventable with _subscribe method", () => {
    const e = eventable<number>((cb) => {
      return { [Symbol.dispose]() {} };
    });
    expect(typeof e._subscribe).toBe("function");
  });

  it("_subscribe receives callbacks and returns Disposable", () => {
    const listeners = new Set<(v: number) => void>();
    const e = eventable<number>((cb) => {
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
  it("returns the eventable cast as EventReq", () => {
    const e = eventable<string>((cb) => ({
      [Symbol.dispose]() {},
    }));
    const req = waitFor(e);
    // At runtime, req IS the eventable object (just type-cast)
    expect(req).toBe(e);
  });
});
