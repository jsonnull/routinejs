import type { ControllerGen } from "./yieldables.js";
import { ChildScope } from "./child-scope.js";

export function isDisposable(x: any): x is Disposable {
  return x && typeof x === "object" && typeof x[Symbol.dispose] === "function";
}

export abstract class Controllable implements Disposable {
  #stack = new DisposableStack();

  own<T extends Disposable | AsyncDisposable | null | undefined>(d: T): T {
    if (!d) return d;
    if (isDisposable(d)) {
      this.#stack.use(d);
    } else {
      const asyncD = d as AsyncDisposable;
      this.#stack.use({
        [Symbol.dispose]() {
          void asyncD[Symbol.asyncDispose]();
        },
      });
    }
    return d;
  }

  child(make: () => ControllerGen): ChildScope {
    const scope = new ChildScope(make);
    this.own(scope);
    return scope;
  }

  [Symbol.dispose](): void {
    this.#stack.dispose();
  }
}
