import { ChildScope, type ControllerGen } from "@routinejs/core";

export class RoomManager implements Disposable {
  readonly #rooms = new Map<string, ChildScope>();

  has(name: string): boolean {
    return this.#rooms.has(name);
  }

  open(name: string, make: () => ControllerGen): ChildScope {
    const scope = new ChildScope(make);
    this.#rooms.set(name, scope);
    return scope;
  }

  close(name: string): void {
    const scope = this.#rooms.get(name);
    if (scope) {
      console.log(`[app] closing room "${name}"`);
      this.#rooms.delete(name);
      scope[Symbol.dispose]();
    }
  }

  [Symbol.dispose]() {
    for (const scope of this.#rooms.values()) {
      scope[Symbol.dispose]();
    }
    this.#rooms.clear();
  }
}
