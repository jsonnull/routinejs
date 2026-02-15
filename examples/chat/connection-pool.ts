export class ConnectionPool implements Disposable {
  constructor() {
    // In a real app, this would open database connections, websockets, etc.
  }

  [Symbol.dispose]() {
    console.log("[app] connection pool closed");
  }
}
