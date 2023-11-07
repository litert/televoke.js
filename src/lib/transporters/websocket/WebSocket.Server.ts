/**
* Copyright 2023 Angus.Fenying <fenying@litert.org>
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
import * as dWS from './WebSocket.decl';
import type * as Listener from '../http-listener';
import type * as dT from '../Transporter.decl';
import { EventEmitter } from 'node:events';
import { WebSocketTransporter } from './WebSocket.Transporter';

class WebSocketGateway extends EventEmitter implements dT.IGateway {

    private readonly _wsServer: LibWS.IServer;

    public constructor(
        private readonly _listener: Listener.IHttpListener,
        private readonly _server: dT.IServer,
    ) {

        super();

        this._listener
            .on('error', (e) => this.emit('error', e))
            .setUpgradeProcessor(this._onUpgrade);

        this._wsServer = LibWS.createServer({
            liteFrameMode: true,
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

        await this._listener.start();
    }

    public async stop(): Promise<void> {

        if (!this.running) {

            return;
        }

        await this._listener.stop();
    }
}

/**
 * Create a WebSocket gateway.
 *
 * @param listener      The HTTP(S) listener object.
 * @param server        The televoke server object.
 */
export function createWebsocketGateway(
    listener: Listener.IHttpListener,
    server: dT.IServer,
): dT.IGateway {

    return new WebSocketGateway(listener, server);
}
