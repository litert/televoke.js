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

import * as LwDFX from '@litert/lwdfx';
import type * as dT from '../Transporter.decl';
import type * as dL from './LwDFX.decl';
import { EventEmitter } from 'node:events';
import { LwDFXTransporter } from './LwDFX.Transporter';

export type ILwDfxUnixSocketGatewayOptions = LwDFX.UnixSocket.IUnixSocketGatewayOptions;

class LwDfxUnixSocketGateway extends EventEmitter implements dT.IGateway {

    private _gateway: LwDFX.UnixSocket.IUnixSocketGateway | null = null;

    private readonly _lwdfxServer: LwDFX.IServer;

    public constructor(
        serverOpts: dL.ILwDfxServerOptions,
        private readonly _gatewayOpts: ILwDfxUnixSocketGatewayOptions,
        private readonly _server: dT.IServer,
    ) {

        super();

        this._lwdfxServer = LwDFX.createServer({
            ...serverOpts,
            alpWhitelist: ['televoke2']
        });

        this._lwdfxServer.on('connection', (conn) => {

            this._server.registerChannel(new LwDFXTransporter('lwdfx/unix', conn));
        });
    }

    public get running(): boolean {

        return !!this._gateway;
    }

    public async start(): Promise<void> {

        if (this._gateway) {

            return;
        }

        this._gateway = LwDFX.UnixSocket.createGateway(this._lwdfxServer, this._gatewayOpts);

        try {

            await this._gateway.start();
        }
        catch (e) {

            this._gateway = null;
            throw e;
        }
    }

    public async stop(): Promise<void> {

        if (!this._gateway) {

            return;
        }

        await this._gateway.stop();
        this._gateway = null;
    }
}

export function createUnixSocketGateway(
    server: dT.IServer,
    gatewayOpts: ILwDfxUnixSocketGatewayOptions,
    serverOpts: dL.ILwDfxServerOptions = {},
): dT.IGateway {

    return new LwDfxUnixSocketGateway(serverOpts, gatewayOpts, server);
}
