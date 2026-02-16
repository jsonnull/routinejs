import { describe, it, expect } from "vitest";
import {
  RoutineNode,
  routine,
  eventRoutine,
  emitter,
  waitFor,
  INDEFINITELY,
} from "../src/index.js";
import type { RoutineGen, RoutineEmitter } from "../src/index.js";

class App extends RoutineNode {}

describe("routine()", () => {
  it("runs generator via root.child()", () => {
    const log: string[] = [];

    const MyRoutine = routine(function* (app: App): RoutineGen {
      log.push("running");
      yield INDEFINITELY;
    });

    const app = new App();
    MyRoutine.run(app);

    expect(log).toEqual(["running"]);

    app[Symbol.dispose]();
  });

  it("child is owned by root — disposing root disposes child", () => {
    let childDisposed = false;

    const MyRoutine = routine(function* (app: App): RoutineGen {
      try {
        yield INDEFINITELY;
      } finally {
        childDisposed = true;
      }
    });

    const app = new App();
    MyRoutine.run(app);

    expect(childDisposed).toBe(false);
    app[Symbol.dispose]();
    expect(childDisposed).toBe(true);
  });
});

describe("eventRoutine()", () => {
  it("passes emitter defs and root to generator", () => {
    const listeners = new Set<(v: string) => void>();
    const myEvent: RoutineEmitter<string> = emitter((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const received: string[] = [];
    let gotRoot: App | undefined;

    const MyRoutine = eventRoutine(
      { myEvent },
      function* (_opts, { myEvent, root }) {
        gotRoot = root;
        const v = yield waitFor(myEvent);
        received.push(v);
      },
    );

    const app = new App();
    MyRoutine.run(app);

    expect(gotRoot).toBe(app);
    expect(listeners.size).toBe(1);

    // Fire event
    for (const cb of listeners) cb("hello");
    expect(received).toEqual(["hello"]);

    app[Symbol.dispose]();
  });
});
