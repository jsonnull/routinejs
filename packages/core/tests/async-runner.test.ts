import { describe, it, expect } from "vitest";
import { INDEFINITELY, emitter, waitFor, defaultAsyncRunner } from "../src/index.js";
import type { AsyncRoutineGen } from "../src/index.js";

describe("defaultAsyncRunner", () => {
  it("parks generator on INDEFINITELY yield", async () => {
    const runner = defaultAsyncRunner();
    const log: string[] = [];

    async function* gen(): AsyncRoutineGen {
      log.push("before");
      yield INDEFINITELY;
      log.push("after"); // should never run
    }

    const g = gen();
    runner.attach(g);
    await runner.step(g);

    expect(log).toEqual(["before"]);

    // Further steps should be no-ops (parked)
    await runner.step(g);
    expect(log).toEqual(["before"]);
  });

  it("subscribes on EventReq yield and resumes with payload", async () => {
    const runner = defaultAsyncRunner();
    const listeners = new Set<(v: number) => void>();
    const e = emitter<number>((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const received: number[] = [];

    async function* gen(): AsyncRoutineGen {
      const v = yield waitFor(e);
      received.push(v);
    }

    const g = gen();
    runner.attach(g);
    await runner.step(g);

    // Generator is now waiting for event
    expect(listeners.size).toBe(1);

    // Fire event
    for (const cb of listeners) cb(99);

    // Allow async step to complete
    await new Promise((r) => setTimeout(r, 0));

    expect(received).toEqual([99]);
    expect(listeners.size).toBe(0);
  });

  it("unsubscribes after first event (single-shot)", async () => {
    const runner = defaultAsyncRunner();
    const listeners = new Set<(v: string) => void>();
    const e = emitter<string>((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const received: string[] = [];

    async function* gen(): AsyncRoutineGen {
      while (true) {
        const v = yield waitFor(e);
        received.push(v);
      }
    }

    const g = gen();
    runner.attach(g);
    await runner.step(g);

    expect(listeners.size).toBe(1);

    // Fire first event
    const cbs = [...listeners];
    cbs[0]("a");

    await new Promise((r) => setTimeout(r, 0));

    expect(received).toEqual(["a"]);
    expect(listeners.size).toBe(1);

    // Fire second event
    const cbs2 = [...listeners];
    cbs2[0]("b");

    await new Promise((r) => setTimeout(r, 0));

    expect(received).toEqual(["a", "b"]);
  });

  it("disposeGen cleans up subscriptions", async () => {
    const runner = defaultAsyncRunner();
    const listeners = new Set<(v: number) => void>();
    const e = emitter<number>((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    async function* gen(): AsyncRoutineGen {
      yield waitFor(e);
    }

    const g = gen();
    runner.attach(g);
    await runner.step(g);

    expect(listeners.size).toBe(1);

    await runner.disposeGen(g);

    expect(listeners.size).toBe(0);
  });

  it("throws on unknown yield value", async () => {
    const runner = defaultAsyncRunner();

    async function* gen(): any {
      yield "not-a-valid-yieldable";
    }

    const g = gen();
    runner.attach(g);

    await expect(runner.step(g)).rejects.toThrow("Invalid yield");
  });

  it("handles async work between yields", async () => {
    const runner = defaultAsyncRunner();
    const log: string[] = [];

    async function* gen(): AsyncRoutineGen {
      log.push("start");
      await new Promise((r) => setTimeout(r, 10));
      log.push("after-await");
      yield INDEFINITELY;
    }

    const g = gen();
    runner.attach(g);
    await runner.step(g);

    expect(log).toEqual(["start", "after-await"]);
  });
});
