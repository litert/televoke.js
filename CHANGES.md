# Changes Logs

## v1.1.0

- feat(protocol): added experimental supports for transports between worker thread.
- fix(protocol): simplified the ITransporter.end method.
- fix(decoder): should decode protocol error as special error.
- fix(protocol): put protocol-error code in server_internal_server data.

## v1.0.3

- fix(client): Set default maxConnections to `100` for `televoke/1` protocol clients.
- fix(client): Emit `close` event when connection to server is closed.

## v1.0.2

- build(project): updated dependencies.

## v1.0.1

- build(project): full refactored.
- feat(protocol): added televoke/2 protocol supports.
- build(protocol): removed supports for TCP-based televoke/1 protocol.

## v0.4.6

- fix(server): refuse bad requests correctly.
- build(protocol): deprecated TCP-based televoke/1 protocol.
- feat(server): added protocol version.
- feat(server): added omitted gateway port supports.

## v0.4.5

- feat(server): added listen backlog supports.
- feat(server): added client IP address in request context.

## v0.4.4

- fix(client): simplified the exception.

## v0.4.3

- fix(client): export TLS client and fix tcp client naming.

## v0.4.2

- fix(server): removed the index signature limits of `IServiceAPIs`.

## v0.4.1

- fix(client): fixed name and implement of `createRandStringRIDGenerator`.

## v0.4.0

- feat(client): added HTTPS/TLS client supports.
- feat(client): added built-in RID generators.
- refactor(client): used packed-object for the factory parameters.
- feat(client): allow using determined HTTP path as RPC entry.

## v0.3.3

- config(deps): updated the dependencies.

## v0.3.2

- feat(client): allow customized API name wrapper.

## v0.3.1

- fix(server): fixed the possible non-caught exception in non-async promise-type handler.
- feat(router): non-async handler is allowed.

## v0.3.0

- refactor(router): extract all routing logics from server into router.

## v0.2.0

- refactor(global): Improved the experience.
- refactor(client): Use EventEmitter instead of simple hook point.
- perf(encoder): Fixed the debuff of encoder.
