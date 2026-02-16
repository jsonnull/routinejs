import { describe, it, expect } from "vitest";
import { AsyncChildScope, INDEFINITELY, emitter, waitFor } from "../src/index.js";
import type { AsyncRoutineGen } from "../src/index.js";

describe("AsyncChildScope", () => {
  it("constructor + ready: generator runs to first yield", async () => {
    const log: string[] = [];

    const scope = new AsyncChildScope(async function* (): AsyncRoutineGen {
      log.push("started");
      yield INDEFINITELY;
    });

    await scope.ready;
    expect(log).toEqual(["started"]);
  });

  it("dispose() stops the generator and runs finally blocks", async () => {
    const log: string[] = [];

    const scope = new AsyncChildScope(async function* (): AsyncRoutineGen {
      try {
        log.push("started");
        yield INDEFINITELY;
        log.push("after-indefinitely"); // should never run
      } finally {
        log.push("finally");
      }
    });

    await scope.ready;
    expect(scope.disposed).toBe(false);
    await scope[Symbol.asyncDispose]();
    expect(scope.disposed).toBe(true);
    expect(log).toContain("finally");
    expect(log).not.toContain("after-indefinitely");
  });

  it("dispose() is idempotent", async () => {
    let disposeCount = 0;

    const scope = new AsyncChildScope(async function* (): AsyncRoutineGen {
      try {
        yield INDEFINITELY;
      } finally {
        disposeCount++;
      }
    });

    await scope.ready;
    await scope[Symbol.asyncDispose]();
    await scope[Symbol.asyncDispose]();
    expect(disposeCount).toBe(1);
  });

  it("resume() is no-op after dispose", async () => {
    const log: string[] = [];
    const listeners = new Set<(v: number) => void>();
    const e = emitter<number>((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const scope = new AsyncChildScope(async function* (): AsyncRoutineGen {
      const v = yield waitFor(e);
      log.push(`got: ${v}`);
    });

    await scope.ready;
    await scope[Symbol.asyncDispose]();
    // resume after dispose should be no-op
    await scope.resume(42);
    expect(log).toEqual([]);
  });

  it("await using inside async generator cleans up on dispose", async () => {
    const log: string[] = [];

    const scope = new AsyncChildScope(async function* (): AsyncRoutineGen {
      await using _resource = {
        async [Symbol.asyncDispose]() {
          log.push("resource-disposed");
        },
      };
      log.push("acquired");
      yield INDEFINITELY;
    });

    await scope.ready;
    expect(log).toEqual(["acquired"]);

    await scope[Symbol.asyncDispose]();
    expect(log).toContain("resource-disposed");
  });
});
