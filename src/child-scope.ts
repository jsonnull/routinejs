import type { ControllerGen } from "./yieldables.js";
import { defaultRunner, type Runner } from "./runner.js";

export class ChildScope implements Disposable {
  readonly #runner: Runner;
  readonly #gen: ControllerGen;

  disposed = false;

  constructor(make: () => ControllerGen, runner?: Runner) {
    this.#runner = runner ?? defaultRunner();
    this.#gen = make();
    this.#runner.attach(this.#gen);
    this.#runner.step(this.#gen);
  }

  resume(value?: any): void {
    if (this.disposed) return;
    this.#runner.step(this.#gen, value);
  }

  [Symbol.dispose](): void {
    if (this.disposed) return;
    this.disposed = true;
    this.#runner.disposeGen(this.#gen);
  }
}
