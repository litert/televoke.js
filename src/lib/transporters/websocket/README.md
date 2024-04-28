# Televoke2/Websocket

This module provides the Televoke2 protocol over websocket. It allows you to connect to the Televoke2 server with websocket.

> `@litert/websocket` is required to use this module.
>
> And by default it uses unmasked data frames in client-side, which maybe incompatible with some server implementations. You could enable the mask feature by yourself, and improved the masking performance by use the `@litert/ws-utils` module, which is a C++ addon.

## Examples

- [Server](../../../examples/network/server.ts)
- [Client over TCP](../../../examples/network/ws-client.ts)
- [Client over TLS](../../../examples/network/wss-client.ts)
- [Client over Unix Domain Socket](../../../examples/network/ws-unix-client.ts)
