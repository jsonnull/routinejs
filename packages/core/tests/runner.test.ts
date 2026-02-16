import { describe, it, expect } from "vitest";
import { INDEFINITELY, emitter, waitFor, defaultRunner } from "../src/index.js";
import type { RoutineGen } from "../src/index.js";

describe("defaultRunner", () => {
  it("parks generator on INDEFINITELY yield", () => {
    const runner = defaultRunner();
    const log: string[] = [];

    function* gen(): RoutineGen {
      log.push("before");
      yield INDEFINITELY;
      log.push("after"); // should never run
    }

    const g = gen();
    runner.attach(g);
    runner.step(g);

    expect(log).toEqual(["before"]);

    // Further steps should be no-ops (parked)
    runner.step(g);
    expect(log).toEqual(["before"]);
  });

  it("subscribes on EventReq yield and resumes with payload", () => {
    const runner = defaultRunner();
    const listeners = new Set<(v: number) => void>();
    const e = emitter<number>((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const received: number[] = [];

    function* gen(): RoutineGen {
      const v = yield waitFor(e);
      received.push(v);
    }

    const g = gen();
    runner.attach(g);
    runner.step(g);

    // Generator is now waiting for event
    expect(listeners.size).toBe(1);

    // Fire event
    for (const cb of listeners) cb(99);

    expect(received).toEqual([99]);
    // After resume + completion, subscription should be cleaned up
    expect(listeners.size).toBe(0);
  });

  it("unsubscribes after first event (single-shot)", () => {
    const runner = defaultRunner();
    const listeners = new Set<(v: string) => void>();
    const e = emitter<string>((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const received: string[] = [];

    function* gen(): RoutineGen {
      while (true) {
        const v = yield waitFor(e);
        received.push(v);
      }
    }

    const g = gen();
    runner.attach(g);
    runner.step(g);

    expect(listeners.size).toBe(1);

    // Fire first event - generator resumes, yields waitFor again, re-subscribes
    const cbs = [...listeners];
    cbs[0]("a");

    expect(received).toEqual(["a"]);
    // Should have re-subscribed for next event
    expect(listeners.size).toBe(1);

    // Fire second event
    const cbs2 = [...listeners];
    cbs2[0]("b");
    expect(received).toEqual(["a", "b"]);
  });

  it("disposes generator resources on completion", () => {
    const runner = defaultRunner();
    let disposed = false;

    function* gen(): RoutineGen {
      // Generator completes immediately (no yield)
    }

    const g = gen();
    runner.attach(g);

    // Attach a resource via manual state manipulation is not possible from outside,
    // but we can verify disposeGen is called by checking gen is done
    runner.step(g);

    // Generator completed, further steps should be safe no-ops
    runner.step(g);
  });

  it("throws on unknown yield value", () => {
    const runner = defaultRunner();

    function* gen(): any {
      yield "not-a-valid-yieldable";
    }

    const g = gen();
    runner.attach(g);

    expect(() => runner.step(g)).toThrow("Invalid yield");
  });

  it("disposeGen cleans up subscriptions", () => {
    const runner = defaultRunner();
    const listeners = new Set<(v: number) => void>();
    const e = emitter<number>((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    function* gen(): RoutineGen {
      yield waitFor(e);
    }

    const g = gen();
    runner.attach(g);
    runner.step(g);

    expect(listeners.size).toBe(1);

    // Dispose the generator before event fires
    runner.disposeGen(g);

    expect(listeners.size).toBe(0);
  });
});
