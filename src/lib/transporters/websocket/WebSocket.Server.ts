/**
 * Copyright 2025 Angus.Fenying <fenying@litert.org>
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

import * as LibWS from '@litert/websocket';
import type * as NodeHttp from 'node:http';
import * as dWS from './WebSocket.decl';
import type * as Listener from '../http-listener';
import type * as dT from '../Transporter.decl';
import { EventEmitter } from 'node:events';
import { WebSocketTransporter } from './WebSocket.Transporter';

export interface IRegisterListenerOptions {

    onErrorCallback: (e: Error) => void;

    onUpgradeCallback: (req: NodeHttp.IncomingMessage, socket: NodeJS.Socket, head: Buffer) => void;
}

export interface IRegisterListenerResult {

    stop?: () => void | Promise<void>;

    start?: () => void | Promise<void>;

    readonly running: boolean;
}

class WebSocketGateway extends EventEmitter implements dT.IGateway {

    private readonly _wsServer: LibWS.IServer;

    private readonly _listener: IRegisterListenerResult;

    public constructor(
        registerListener: (opts: IRegisterListenerOptions) => IRegisterListenerResult,
        private readonly _server: dT.IServer,
        timeout?: number,
    ) {

        super();

        this._listener = registerListener({
            'onErrorCallback': (e) => this.emit('error', e),
            'onUpgradeCallback': this._onUpgrade,
        });

        this._wsServer = LibWS.createServer({
            frameReceiveMode: LibWS.EFrameReceiveMode.LITE,
            timeout,
        });
    }

    private readonly _onUpgrade: Listener.IUpgradeProcessor = (req, socket) => {

        let apn: string | string[] = req.headers[LibWS.H1_HDR_NAME_WS_PROTOCOL]!;

        if (!apn) {

            this._wsServer.reject({
                'request': req,
                'socket': socket as any,
            });
            return;
        }

        if (!Array.isArray(apn)) {

            apn = [apn];
        }

        if (!apn.includes(dWS.WEBSOCKET_SUB_PROTOCOL)) {

            this._wsServer.reject({
                'request': req,
                'socket': socket as any,
            });
            return;
        }

        const ws = this._wsServer.accept({
            'request': req,
            'socket': socket as any,
            'subProtocol': dWS.WEBSOCKET_SUB_PROTOCOL,
        });

        this._server.registerChannel(new WebSocketTransporter(dWS.WS_PROTOCOL_NAME, ws));
    };

    public get running(): boolean {

        return this._listener.running;
    }

    public async start(): Promise<void> {

        if (this.running) {

            return;
        }

        await this._listener.start?.();
    }

    public async stop(): Promise<void> {

        if (!this.running) {

            return;
        }

        await this._listener.stop?.();
    }
}

export interface IWebSocketGatewayOptions {

    /**
     * The timeout of WebSocket connections.
     *
     * > Set to 0 to disable timeout.
     *
     * @default 60000
     */
    timeout?: number;
}

/**
 * Create a WebSocket gateway, binding to a simple built-in HTTP(S) listener.
 *
 * > When using built-in HTTP server, the api will ignore other headers, path and query string in the URL.
 *
 * @param listener      The HTTP(S) listener object.
 * @param server        The televoke server object.
 */
export function createWebsocketGateway(
    listener: Listener.IHttpListener,
    server: dT.IServer,
    options: IWebSocketGatewayOptions = {}
): dT.IGateway {

    return new WebSocketGateway((o) => {

        listener.on('error', o.onErrorCallback);
        listener.setUpgradeProcessor(o.onUpgradeCallback);

        return listener;

    }, server, options.timeout);
}

/**
 * Create a WebSocket gateway, binding to a custom HTTP server.
 *
 * > When using a custom HTTP server, it's able to preprocess the request before passing to the server, like
 * > authentication, rate limiting, custom routing, etc.
 *
 * @param registerListener  The function to register the listener to the custom HTTP server.
 * @param server            The server to process the requests.
 */
export function createCustomWebsocketGateway(
    registerListener: (opts: IRegisterListenerOptions) => IRegisterListenerResult,
    server: dT.IServer
): dT.IGateway {

    return new WebSocketGateway(registerListener, server);
}
