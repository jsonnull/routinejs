import { describe, it, expect } from "vitest";
import {
  AsyncRoutineNode,
  asyncRoutine,
  asyncEventRoutine,
  emitter,
  waitFor,
  INDEFINITELY,
} from "../src/index.js";
import type { AsyncRoutineGen, RoutineEmitter } from "../src/index.js";

class App extends AsyncRoutineNode {}

describe("asyncRoutine()", () => {
  it("wraps async generator and runs via root.child()", async () => {
    const log: string[] = [];

    const MyRoutine = asyncRoutine(async function* (app: App): AsyncRoutineGen {
      log.push("running");
      yield INDEFINITELY;
    });

    const app = new App();
    await MyRoutine.run(app);

    expect(log).toEqual(["running"]);

    await app[Symbol.asyncDispose]();
  });

  it("disposing root disposes async child", async () => {
    let childDisposed = false;

    const MyRoutine = asyncRoutine(async function* (app: App): AsyncRoutineGen {
      try {
        yield INDEFINITELY;
      } finally {
        childDisposed = true;
      }
    });

    const app = new App();
    await MyRoutine.run(app);

    expect(childDisposed).toBe(false);
    await app[Symbol.asyncDispose]();
    expect(childDisposed).toBe(true);
  });
});

describe("asyncEventRoutine()", () => {
  it("passes emitter defs and root to generator", async () => {
    const listeners = new Set<(v: string) => void>();
    const myEvent: RoutineEmitter<string> = emitter((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const received: string[] = [];
    let gotRoot: App | undefined;

    const MyRoutine = asyncEventRoutine(
      { myEvent },
      async function* (_opts, { myEvent, root }) {
        gotRoot = root;
        const v = yield waitFor(myEvent);
        received.push(v);
      },
    );

    const app = new App();
    await MyRoutine.run(app);

    expect(gotRoot).toBe(app);
    expect(listeners.size).toBe(1);

    // Fire event
    for (const cb of listeners) cb("hello");

    await new Promise((r) => setTimeout(r, 0));

    expect(received).toEqual(["hello"]);

    await app[Symbol.asyncDispose]();
  });
});
