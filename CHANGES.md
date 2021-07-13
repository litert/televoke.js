# Changes Logs

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
