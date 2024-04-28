# Televoke2/WorkerThread

This module provides the Televoke2 protocol over Node.js Worker Threads, which allows you to connect the main thread and
worker threads with the Televoke2 protocol.

You could either make the main thread as a server or a client, and the worker threads as clients or servers.

## Examples

- Main Thread As Server

    - Check the [server code (main thread)](../../../examples/worker-thread/main-server.ts)
    - Check the [client code (worker thread)](../../../examples/worker-thread/worker-client.ts)

- Worker Thread As Server

    - Check the [server code (worker thread)](../../../examples/worker-thread/worker-server.ts)
    - Check the [client code (main thread)](../../../examples/worker-thread/main-client.ts)
