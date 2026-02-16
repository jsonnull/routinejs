import { describe, it, expect } from "vitest";
import { AsyncRoutineNode, INDEFINITELY } from "../src/index.js";
import type { AsyncRoutineGen } from "../src/index.js";

class TestAsyncRoutineNode extends AsyncRoutineNode {}

describe("AsyncRoutineNode", () => {
  it("own() with Disposable works", async () => {
    const node = new TestAsyncRoutineNode();
    let disposed = false;

    node.own({
      [Symbol.dispose]() {
        disposed = true;
      },
    });

    expect(disposed).toBe(false);
    await node[Symbol.asyncDispose]();
    expect(disposed).toBe(true);
  });

  it("own() with AsyncDisposable works", async () => {
    const node = new TestAsyncRoutineNode();
    let disposed = false;

    node.own({
      async [Symbol.asyncDispose]() {
        disposed = true;
      },
    });

    expect(disposed).toBe(false);
    await node[Symbol.asyncDispose]();
    expect(disposed).toBe(true);
  });

  it("own() handles null/undefined gracefully", async () => {
    const node = new TestAsyncRoutineNode();
    const result = node.own(null);
    expect(result).toBeNull();
    const result2 = node.own(undefined);
    expect(result2).toBeUndefined();
    await node[Symbol.asyncDispose]();
  });

  it("disposal properly awaits async resources", async () => {
    const node = new TestAsyncRoutineNode();
    const log: string[] = [];

    node.own({
      async [Symbol.asyncDispose]() {
        await new Promise((r) => setTimeout(r, 10));
        log.push("async-disposed");
      },
    });

    await node[Symbol.asyncDispose]();
    expect(log).toEqual(["async-disposed"]);
  });

  it("async disposal errors propagate", async () => {
    const node = new TestAsyncRoutineNode();

    node.own({
      async [Symbol.asyncDispose]() {
        throw new Error("dispose-error");
      },
    });

    await expect(node[Symbol.asyncDispose]()).rejects.toThrow("dispose-error");
  });

  it("LIFO order maintained", async () => {
    const node = new TestAsyncRoutineNode();
    const order: number[] = [];

    node.own({ [Symbol.dispose]: () => order.push(1) });
    node.own({
      async [Symbol.asyncDispose]() {
        order.push(2);
      },
    });
    node.own({ [Symbol.dispose]: () => order.push(3) });

    await node[Symbol.asyncDispose]();
    expect(order).toEqual([3, 2, 1]);
  });

  it("child() spawns async generator, awaits initial step", async () => {
    const node = new TestAsyncRoutineNode();
    const log: string[] = [];

    const scope = await node.child(async function* (): AsyncRoutineGen {
      log.push("started");
      yield INDEFINITELY;
      log.push("resumed");
    });

    expect(log).toEqual(["started"]);
    expect(scope.disposed).toBe(false);

    // Disposing the node should dispose the child scope
    await node[Symbol.asyncDispose]();
    expect(scope.disposed).toBe(true);
  });
});
