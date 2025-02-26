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

import * as LibWS from '@litert/websocket';
import type * as NodeHttp from 'node:http';
import * as dWS from './WebSocket.decl';
import type * as dT from '../Transporter.decl';
import { WebSocketTransporter } from './WebSocket.Transporter';

class WsConnector implements IWsConnector {

    public constructor(private readonly _opts: LibWS.IWsConnectOptions) {
        this._opts.headers ??= {};
    }

    public setHeaders(newHeaders: NodeHttp.OutgoingHttpHeaders, append: boolean = true): void {

        if (append) {

            Object.assign(this._opts.headers!, newHeaders);
        }
        else {

            this._opts.headers = newHeaders;
        }
    }

    public async connect(): Promise<dT.ITransporter> {

        const ws = await LibWS.wsConnect({
            ...this._opts,
            headers: {
                ...this._opts?.headers,
                ...LibWS.createClientHandshakeHeaders({
                    'subProtocols': [dWS.WEBSOCKET_SUB_PROTOCOL]
                })
            }
        });

        ws.setMasking(false);

        return new WebSocketTransporter(dWS.WS_PROTOCOL_NAME, ws);
    }
}

class WssConnector implements IWsConnector {

    public constructor(private readonly _opts: LibWS.IWssConnectOptions) {
        this._opts.headers ??= {};
    }

    public setHeaders(newHeaders: NodeHttp.OutgoingHttpHeaders, append: boolean = true): void {

        if (append) {

            Object.assign(this._opts.headers!, newHeaders);
        }
        else {

            this._opts.headers = newHeaders;
        }
    }

    public async connect(): Promise<dT.ITransporter> {

        const ws = await LibWS.wssConnect({
            ...this._opts,
            headers: {
                ...this._opts?.headers,
                ...LibWS.createClientHandshakeHeaders({
                    'subProtocols': [dWS.WEBSOCKET_SUB_PROTOCOL]
                })
            }
        });

        ws.setMasking(false);

        return new WebSocketTransporter(dWS.WSS_PROTOCOL_NAME, ws);
    }
}

export interface IWsConnector extends dT.IConnector {

    /**
     * Setup the custom headers for websocket negotiation on each connection.
     *
     * **WARNING:**
     * **In browser environment, the Websocket class cannot send custom headers.**
     * **Considering the compatibility, custom headers in Websocket protocol are not recommended to use.**
     * ***Don't use this feature unless you don't care about the compatibility in browser environment.***
     *
     * @param newHeaders    The new headers to set.
     * @param append        Whether to append the new headers to existing headers, or replace all headers. [Default: true]
     */
    setHeaders(newHeaders: NodeHttp.OutgoingHttpHeaders, append?: boolean): void;
}

export function createWsConnector(opts: LibWS.IWsConnectOptions): IWsConnector {

    opts.frameReceiveMode = LibWS.EFrameReceiveMode.LITE;
    return new WsConnector(opts);
}

export function createWssConnector(opts: LibWS.IWssConnectOptions): IWsConnector {

    opts.frameReceiveMode = LibWS.EFrameReceiveMode.LITE;
    return new WssConnector(opts);
}
