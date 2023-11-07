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

import * as Https from 'node:https';
import type * as $Net from 'node:net';
import * as dH from './Http.Decl';
import * as v1 from '../../shared/Encodings/v1';
import { AbstractHttpListener } from './AbstractHttpListener';

class HttpsListener extends AbstractHttpListener {

    public constructor(
        private readonly _opts: dH.IHttpsListenerOptions,
    ) {

        super();

        this.port = _opts.port ?? v1.DEFAULT_SECURE_PORT;
    }

    public async start(): Promise<void> {

        if (this._gateway) {

            return;
        }

        const gateway = Https.createServer(this._opts.tlsOptions ?? {}, this._apiProcessor);

        const ret = new Promise<void>((resolve, reject) => {
            gateway.on('error', (e) => {
                reject(e);
            }).on('listening', () => {

                gateway.removeAllListeners('error');
                this._gateway = gateway;
                if (this._opts.port === 0) {

                    this._opts.port = (gateway.address() as $Net.AddressInfo).port;
                }
                gateway.on('error', (e) => this.emit('error', e));
                gateway.on('upgrade', this._upgradeProcessor);
                resolve();
            });
        });

        gateway.listen(
            this._opts.port ?? v1.DEFAULT_SECURE_PORT,
            this._opts.hostname ?? v1.DEFAULT_HOSTNAME,
            this._opts.backlog ?? v1.DEFAULT_BACKLOG,
        );

        return ret;
    }

    public async stop(): Promise<void> {

        if (!this._gateway) {

            return Promise.resolve();
        }

        const gateway = this._gateway;

        return new Promise<void>((resolve, reject) => {

            gateway.close((e) => {

                if (e) {

                    reject(e);
                    return;
                }

                resolve();

                if (this._gateway === gateway) {

                    this._gateway = null;
                }
            });
        });
    }
}

export function createHttpsListener(opts: dH.IHttpsListenerOptions): dH.IHttpListener {

    return new HttpsListener(opts);
}
