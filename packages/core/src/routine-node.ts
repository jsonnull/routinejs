import type { RoutineGen } from "./yieldables.js";
import { ChildScope } from "./child-scope.js";

export function isDisposable(x: any): x is Disposable {
  return x && typeof x === "object" && typeof x[Symbol.dispose] === "function";
}

export function isAsyncDisposable(x: any): x is AsyncDisposable {
  return (
    x && typeof x === "object" && typeof x[Symbol.asyncDispose] === "function"
  );
}

export abstract class RoutineNode implements Disposable {
  #stack = new DisposableStack();

  own<T extends Disposable | null | undefined>(d: T): T {
    if (!d) return d;
    this.#stack.use(d);
    return d;
  }

  child(make: () => RoutineGen): ChildScope {
    const scope = new ChildScope(make);
    this.own(scope);
    return scope;
  }

  [Symbol.dispose](): void {
    this.#stack.dispose();
  }
}
