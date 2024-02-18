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
import * as dWS from './WebSocket.decl';
import type * as dT from '../Transporter.decl';
import { WebSocketTransporter } from './WebSocket.Transporter';

class WsConnector implements dT.IConnector {

    public constructor(private readonly _opts: LibWS.IWsConnectOptions) {}

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

class WssConnector implements dT.IConnector {

    public constructor(private readonly _opts: LibWS.IWssConnectOptions) {}

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

export function createWsConnector(opts: LibWS.IWsConnectOptions): dT.IConnector {

    opts.liteFrameMode = true;
    return new WsConnector(opts);
}

export function createWssConnector(opts: LibWS.IWssConnectOptions): dT.IConnector {

    opts.liteFrameMode = true;
    return new WssConnector(opts);
}
