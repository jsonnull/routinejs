# routinejs

Express ownership graphs and control flow together, with automatic resource management.

## How it works

- **Ownership graph**: objects and routines form a tree; disposing a node tears down its entire subtree
- **Control flow**: generator-based routines suspend and resume within the ownership graph

### Ownership and scoped lifetimes

`RoutineNode` is the base class for objects that own resources and child routines. Call `.own()` to tie a resource to the node's lifetime, and `.child()` to spawn a child generator routine. When a node is disposed, teardown propagates through the entire subtree: children, their resources, everything.

```ts
class App extends RoutineNode {
  readonly db: Database;

  constructor() {
    super();
    this.db = this.own(new Database()); // disposed when App is disposed
  }
}
```

Inside generator routines, `using` declarations tie resource lifetimes to the generator's scope:

```ts
function* worker(app: App): RoutineGen {
  using conn = app.db.connect(); // cleaned up when this routine ends
  yield INDEFINITELY;
}
```

### Generators as routines

A generator function becomes a long-lived routine. Routines suspend with `yield` and resume when something happens:

- `yield INDEFINITELY` – park the routine forever (it stays alive until its parent disposes it)
- `yield waitFor(someEmitter)` – suspend until the next event, then resume with the payload

```ts
const MyRoutine = routine(function* (app: App): RoutineGen {
  while (true) {
    const msg = yield waitFor(app.messages);
    console.log(msg);
  }
});
```

### Sync and async

Sync routines (`RoutineNode` + `routine()`) are fully synchronous: events fire, generators resume, the stack unwinds. No promises, no microtask queues.

Async routines (`AsyncRoutineNode` + `asyncRoutine()`) use async generators and `AsyncDisposable`. Generators can `await` between yields, resources can be async-disposed, and `await using` works naturally.

## Install

```
npm install @routinejs/core
```

## Quick example

```ts
import { RoutineNode, routine, emitter, waitFor, type RoutineGen, type RoutineEmitter } from "@routinejs/core";

class Counter extends RoutineNode {
  readonly onIncrement: RoutineEmitter<number>;
  #listeners = new Set<(n: number) => void>();

  constructor() {
    super();
    this.onIncrement = emitter((cb) => {
      this.#listeners.add(cb);
      return { [Symbol.dispose]: () => void this.#listeners.delete(cb) };
    });
  }

  increment(n: number) {
    for (const cb of [...this.#listeners]) cb(n);
  }
}

const CountRoutine = routine(function* (counter: Counter): RoutineGen {
  let total = 0;
  while (true) {
    const n = yield waitFor(counter.onIncrement);
    total += n;
    console.log(`total: ${total}`);
  }
});

const counter = new Counter();
CountRoutine.run(counter);

counter.increment(1); // total: 1
counter.increment(5); // total: 6

counter[Symbol.dispose](); // tears down the routine and all owned resources
```

## Async quick example

Async routines can `await` between yields — useful when processing an event requires async work (database writes, network calls, etc).

```ts
import { AsyncRoutineNode, asyncRoutine, emitter, waitFor, type AsyncRoutineGen, type RoutineEmitter } from "@routinejs/core";

class App extends AsyncRoutineNode {
  readonly onMessage: RoutineEmitter<string>;
  #listeners = new Set<(msg: string) => void>();

  constructor() {
    super();
    this.onMessage = emitter((cb) => {
      this.#listeners.add(cb);
      return { [Symbol.dispose]: () => void this.#listeners.delete(cb) };
    });
  }

  send(msg: string) {
    for (const cb of [...this.#listeners]) cb(msg);
  }
}

const Logger = asyncRoutine(async function* (app: App): AsyncRoutineGen {
  while (true) {
    const msg = yield waitFor(app.onMessage);
    await writeToFile(msg); // can await between yields
    console.log(`logged: ${msg}`);
  }
});

{
  await using app = new App();
  await Logger.run(app); // resolves once the generator reaches its first yield
  app.send("hello");     // triggers the routine; async processing begins
}
// app is async-disposed here, tearing down the routine and all owned resources
```

Note: `await Logger.run(app)` resolves as soon as the generator reaches its first `yield`, not when the routine finishes. Events fired on the node trigger the generator to resume, but async work between yields (like `await writeToFile(msg)`) means the generator re-subscribes only after that work completes.

## API

### `RoutineNode`

Abstract base class for objects that own resources and child routines.

- `.own(resource)` – ties a `Disposable` to this node's lifetime
- `.child(make)` – spawns a child generator routine, owned by this node
- `[Symbol.dispose]()` – tears down the node and everything it owns

```ts
class App extends RoutineNode {
  readonly chat = this.own(new ChatService());
  readonly rooms = this.own(new RoomManager());
}

const app = new App();
app[Symbol.dispose](); // disposes rooms, then chat (LIFO)
```

### `AsyncRoutineNode`

Async counterpart of `RoutineNode`. Implements `AsyncDisposable` and uses `AsyncDisposableStack` internally, so `.own()` accepts both sync and async disposables.

- `.own(resource)` – ties a `Disposable` or `AsyncDisposable` to this node's lifetime
- `.child(make)` – spawns an async child generator routine, returns `Promise<AsyncChildScope>`
- `[Symbol.asyncDispose]()` – async teardown of the node and everything it owns

```ts
class App extends AsyncRoutineNode {
  readonly conn = this.own(new AsyncConnection()); // async-disposed when App is disposed
}

const app = new App();
await app[Symbol.asyncDispose](); // awaits async cleanup of conn
```

### `routine(make)`

Wraps a generator function into a `Routine<T>`. Call `.run(root)` to start the routine as a child of `root`.

```ts
const MyRoutine = routine(function* (app: App): RoutineGen {
  console.log("started");
  yield INDEFINITELY;
});

MyRoutine.run(app); // starts a child generator owned by app
```

### `asyncRoutine(make)`

Async counterpart of `routine()`. Wraps an async generator function into an `AsyncRoutine<T>`. Call `.run(root)` to start the routine; the returned promise resolves once the generator reaches its first `yield`.

```ts
const MyRoutine = asyncRoutine(async function* (app: App): AsyncRoutineGen {
  await using conn = app.own(new AsyncConnection());
  while (true) {
    const msg = yield waitFor(app.messages);
    await processMessage(msg);
  }
});

await MyRoutine.run(app); // resolves when generator hits first yield
```

### `eventRoutine(defs, make)`

Like `routine()`, but passes a map of event emitters (plus `root`) into the generator's context. Constrains `yield` to only the declared events.

```ts
const ChatRoutine = eventRoutine(
  { onJoin: app.chat.onJoin, onMessage: app.chat.onMessage },
  function* (_opts, { onJoin, onMessage, root }) {
    const join = yield waitFor(onJoin);
    console.log(`${join.user} joined`);
  },
);
```

### `asyncEventRoutine(defs, make)`

Async counterpart of `eventRoutine()`. Same event-map pattern, but with an async generator.

```ts
const ChatRoutine = asyncEventRoutine(
  { onJoin: app.chat.onJoin, onMessage: app.chat.onMessage },
  async function* (_opts, { onJoin, onMessage, root }) {
    const join = yield waitFor(onJoin);
    await notifyChannel(join.user);
  },
);
```

### `emitter(subscribe)`

Creates a `RoutineEmitter<T>` from a subscribe function. The subscribe function receives a callback and returns a `Disposable` for cleanup.

```ts
const onClick = emitter<MouseEvent>((cb) => {
  el.addEventListener("click", cb);
  return { [Symbol.dispose]: () => el.removeEventListener("click", cb) };
});
```

### `waitFor(emitter)`

Yield token. `yield waitFor(e)` suspends the routine until `e` fires, then resumes with the event payload.

```ts
function* listen(app: App): RoutineGen {
  while (true) {
    const msg = yield waitFor(app.chat.onMessage);
    console.log(msg.text);
  }
}
```

### `INDEFINITELY`

Yield token. `yield INDEFINITELY` parks the routine forever; it stays alive until its parent disposes it. Useful for routines that hold resources via `using` but don't need to react to events.

```ts
app.child(function* (): RoutineGen {
  using conn = new ConnectionPool();
  yield INDEFINITELY; // conn stays open until app disposes this child
});
```

### `ChildScope`

Low-level scope created by `RoutineNode.child()`. Manages a single generator's lifetime. You typically don't construct this directly (`RoutineNode.child()` and `routine()` handle it).

### `AsyncChildScope`

Low-level async scope created by `AsyncRoutineNode.child()`. Manages a single async generator's lifetime. You typically don't construct this directly (`AsyncRoutineNode.child()` and `asyncRoutine()` handle it).

### Types

- `RoutineGen` – `Generator<Yieldable, void, any>`, the return type for routine generator functions
- `AsyncRoutineGen` – `AsyncGenerator<Yieldable, void, any>`, the return type for async routine generator functions
- `RoutineEmitter<T>` – object with `_subscribe(cb): Disposable`, created by `emitter()`
- `Routine<T>` – object with `.run(root: T): void`, created by `routine()`
- `AsyncRoutine<T>` – object with `.run(root: T): Promise<void>`, created by `asyncRoutine()`
- `EventRoutine<T, Defs>` – object with `.run(root: T): void`, created by `eventRoutine()`
- `AsyncEventRoutine<T, Defs>` – object with `.run(root: T): Promise<void>`, created by `asyncEventRoutine()`
- `EventReq<T>` – opaque yield token returned by `waitFor()`
- `EventDefs` – `Record<string, RoutineEmitter<any>>`, map of named emitters for `eventRoutine()` / `asyncEventRoutine()`
- `AllowedYield<Defs>` – union of `INDEFINITELY` and `EventReq` for each emitter in `Defs`
- `Yieldable` – `typeof INDEFINITELY | EventReq<any>`, anything a routine can yield
- `Runner` – sync runner interface used by `ChildScope`
- `AsyncRunner` – async runner interface used by `AsyncChildScope`

## Examples

| Example | Events | `using` | Ownership graph | Generator lifetimes |
|---|---|---|---|---|
| [`examples/chat/`](examples/chat/) | x | x | x | x |

## License

MIT
