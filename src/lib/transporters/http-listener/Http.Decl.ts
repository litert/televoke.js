/**
 * Copyright 2024 Angus.Fenying <fenying@litert.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type * as Shared from '../../shared';
import type * as Https from 'node:https';
import type * as Http from 'node:http';

export type ILegacyHttpApiProcessor = (req: Http.IncomingMessage, resp: Http.ServerResponse) => void;

export type IUpgradeProcessor = (req: Http.IncomingMessage, socket: NodeJS.Socket, head: Buffer) => void;

export interface IHttpListener extends Shared.IEventListener<Shared.IDefaultEvents> {

    /**
     * The port the listener is listening on.
     */
    readonly port: number;

    /**
     * Whether the listener is running.
     */
    readonly running: boolean;

    /**
     * Start the listener.
     */
    start(): Promise<void>;

    /**
     * Stop the listener.
     */
    stop(): Promise<void>;

    /**
     * Set the upgrade processor.
     *
     * @param processor The new processor to set, or `null` to remove the processor and use the default processor.
     */
    setUpgradeProcessor(processor: IUpgradeProcessor | null): void;

    /**
     * Set the legacy API processor.
     *
     * @param processor The new processor to set, or `null` to remove the processor and use the default processor.
     */
    setLegacyApiProcessor(processor: ILegacyHttpApiProcessor | null): void;
}

const DEFAULT_REFUSE_PAYLOAD = Buffer.from('BAD REQUEST');
const DEFAULT_REFUSE_STATUS_CODE = 400;

/**
 * The default processor of legacy HTTP API, it will reject all requests with 400 Bad Request.
 */
export const DEFAULT_LEGACY_HTTP_API_PROCESSOR: ILegacyHttpApiProcessor = function(_req, resp): void {

    // eslint-disable-next-line @typescript-eslint/naming-convention
    resp.writeHead(DEFAULT_REFUSE_STATUS_CODE, {
        'Content-Type': 'text/plain',
        'Content-Length': DEFAULT_REFUSE_PAYLOAD.byteLength,
    });
    resp.end(DEFAULT_REFUSE_PAYLOAD);
};

/**
 * The default upgrade processor, it will destroy the socket.
 */
export const DEFAULT_UPGRADE_PROCESSOR: IUpgradeProcessor = function(req): void {

    const socket = req.socket;

    const header: Http.OutgoingHttpHeaders = {
        'Content-Type': 'text/plain',
        'Content-Length': DEFAULT_REFUSE_PAYLOAD.byteLength,
    };

    socket.write([
        `HTTP/1.1 ${DEFAULT_REFUSE_STATUS_CODE}`,
        ...Object.entries(header).map(([k, v]) => `${k}: ${v as string}`),
        ''
    ].join('\r\n'));

    socket.write(DEFAULT_REFUSE_PAYLOAD);

    socket.write('\r\n');

    socket.end();
};

export interface IHttpListenerOptions {

    /**
     * The hostname to listen on.
     *
     * @default 'localhost'
     */
    hostname?: string;

    /**
     * The port to listen on.
     *
     * @default 80 for http, or 443 for https
     */
    port?: number;

    /**
     * The maximum length of the queue of pending connections.
     *
     * @default 511
     */
    backlog?: number;
}

export interface IHttpUnixSocketOptions {

    /**
     * The path of Unix domain socket to listen on.
     */
    socketPath: string;
}

export interface IHttpsListenerOptions extends IHttpListenerOptions {

    /**
     * The options to create the HTTPS server.
     */
    tlsOptions: Https.ServerOptions;
}
