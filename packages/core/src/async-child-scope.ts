import type { AsyncRoutineGen } from "./yieldables.js";
import { defaultAsyncRunner, type AsyncRunner } from "./async-runner.js";

export class AsyncChildScope implements AsyncDisposable {
  readonly #runner: AsyncRunner;
  readonly #gen: AsyncRoutineGen;
  readonly ready: Promise<void>;

  disposed = false;

  constructor(make: () => AsyncRoutineGen, runner?: AsyncRunner) {
    this.#runner = runner ?? defaultAsyncRunner();
    this.#gen = make();
    this.#runner.attach(this.#gen);
    this.ready = this.#runner.step(this.#gen);
  }

  async resume(value?: any): Promise<void> {
    if (this.disposed) return;
    await this.#runner.step(this.#gen, value);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.#runner.disposeGen(this.#gen);
  }
}
