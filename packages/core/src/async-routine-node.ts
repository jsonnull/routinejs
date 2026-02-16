import type { AsyncRoutineGen } from "./yieldables.js";
import { AsyncChildScope } from "./async-child-scope.js";
import { isDisposable, isAsyncDisposable } from "./routine-node.js";

export abstract class AsyncRoutineNode implements AsyncDisposable {
  #stack = new AsyncDisposableStack();

  own<T extends Disposable | AsyncDisposable | null | undefined>(d: T): T {
    if (!d) return d;
    if (isAsyncDisposable(d)) {
      this.#stack.use(d);
    } else if (isDisposable(d)) {
      this.#stack.use(d);
    }
    return d;
  }

  async child(make: () => AsyncRoutineGen): Promise<AsyncChildScope> {
    const scope = new AsyncChildScope(make);
    await scope.ready;
    this.own(scope);
    return scope;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#stack.disposeAsync();
  }
}
