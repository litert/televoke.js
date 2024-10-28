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

import * as $Https from 'https';
import * as C from './Common';
import * as GE from '../Errors';
import * as G from '../Common';
import * as E from './Errors';
import { Events } from '@litert/observable';

class HttpsClient extends Events.EventEmitter<Events.ICallbackDefinitions> implements C.IClient {

    private readonly _agent: $Https.Agent;

    public onError!: any;

    public constructor(
        private readonly _host: string,
        private readonly _port: number,
        private readonly _ridGenerator: C.IRIDGenerator,
        private readonly _path: string = '',
        private readonly _timeout: number = 30000,
        private readonly _apiNameWrapper?: (name: string) => string,
        tlsAgentOptions?: $Https.AgentOptions,
        private readonly _retryConnReset?: boolean,
    ) {

        super();

        this._agent = new $Https.Agent({
            maxSockets: 0,
            keepAlive: true,
            keepAliveMsecs: this._timeout,
            // servername: _host,
            ...tlsAgentOptions
        });
    }

    public async invoke(api: any, ...args: any[]): Promise<any> {

        try {

            return await this._call(api, false, args);
        }
        catch (e) {

            if (this._retryConnReset && (e as any)?.code === 'ECONNRESET') {

                return this._call(api, false, args);
            }
            else {

                throw e;
            }
        }
    }

    public async call(api: any, ...args: any[]): Promise<any> {

        try {

            return await this._call(api, true, args);
        }
        catch (e) {

            if (this._retryConnReset && (e as any)?.code === 'ECONNRESET') {

                return this._call(api, true, args);
            }
            else {

                throw e;
            }
        }
    }

    private _call(api: any, returnRaw: boolean, args: any[]): Promise<any> {

        const rid = this._ridGenerator();

        const CST = Date.now();

        const content = JSON.stringify({
            ttl: this._timeout,
            rid,
            cst: CST,
            args,
            api: this._apiNameWrapper ? this._apiNameWrapper(api) : api
        });

        return new Promise((resolve, reject) => {

            const length = Buffer.byteLength(content);

            if (length > G.MAX_PACKET_SIZE) {

                reject(new GE.E_PACKET_TOO_LARGE()); return;
            }

            const req = $Https.request({
                port: this._port,
                host: this._host,
                path: this._path,
                agent: this._agent,
                method: 'POST',
                headers: {
                    'content-length': Buffer.byteLength(content),
                    'x-tv-ver': 1
                },
                timeout: this._timeout
            }, (resp) => {

                if (resp.statusCode !== 200) {

                    resp.destroy();
                    reject(new E.E_INVALID_RESPONSE({ statusCode: resp.statusCode })); return;
                }

                if (!resp.headers['content-length']) {

                    resp.destroy();
                    reject(new E.E_INVALID_RESPONSE({ problem: 'no_content_length' })); return;
                }

                const length = parseInt(resp.headers['content-length']);

                if (!Number.isSafeInteger(length) || length > G.MAX_PACKET_SIZE) { // Maximum request packet is 64MB

                    resp.destroy();
                    reject(new GE.E_PACKET_TOO_LARGE({ length })); return;
                }

                const buf = Buffer.allocUnsafe(length);

                let offset: number = 0;

                resp.on('data', (chunk: Buffer) => {

                    const index = offset;

                    offset += chunk.byteLength;

                    if (offset > length) {

                        resp.removeAllListeners('end');
                        resp.removeAllListeners('data');
                        resp.destroy();

                        reject(new GE.E_INVALID_PACKET()); return;
                    }

                    chunk.copy(buf, index);

                }).on('end', () => {

                    let rawData: any;

                    try {

                        rawData = JSON.parse(buf as any);
                    }
                    catch {

                        reject(new GE.E_INVALID_PACKET()); return;
                    }

                    const data = rawData as C.IResponse<any>;
                    data.cst = CST;
                    data.crt = Date.now();

                    switch (data.code) {
                        case G.EResponseCode.OK:
                            resolve(returnRaw ? data : data.body);
                            break;
                        case G.EResponseCode.SYSTEM_ERROR:
                            reject(new E.E_SERVER_INTERNAL_ERROR({
                                api, ...data
                            }));
                            break;
                        case G.EResponseCode.FAILURE:
                            reject(new E.E_SERVER_LOGIC_FAILURE({
                                api, ...data
                            }));
                            break;
                        case G.EResponseCode.API_NOT_FOUND:
                            reject(new E.E_API_NOT_FOUND({
                                api, ...data
                            }));
                            break;
                        default:
                            reject(new E.E_SERVER_UNKNOWN_ERROR({
                                api, ...data
                            }));
                            break;
                    }
                });
            });

            req.once('timeout', () => {
                req.destroy(new E.E_REQUEST_TIMEOUT({
                    metadata: { api, requestId: rid, time: Date.now(), details: null }
                }));
            });

            req.once('error', reject);

            req.end(content);
        });
    }

    public connect(): Promise<void> {

        return Promise.resolve();
    }

    public close(): Promise<void> {

        this._agent.destroy();

        return Promise.resolve();
    }
}

export interface IHttpsClientOptions {

    host: string;

    /**
     * The port of HTTPS server.
     *
     * @default 443
     */
    port?: number;

    /**
     * The path to the RPC entry.
     *
     * @default '/'
     */
    path?: string;

    ridGenerator: C.IRIDGenerator;

    timeout?: number;

    apiNameWrapper?: (name: string) => string;

    tlsAgentOptions?: $Https.AgentOptions;

    /**
     * Whether to retry when the connection is reset.
     *
     * @default false
     */
    retryConnReset?: boolean;
}

export function createHttpsClient<TAPIs extends G.IServiceAPIs>(opts: IHttpsClientOptions): C.IClient<TAPIs> {

    return new HttpsClient(
        opts.host,
        opts.port ?? 443,
        opts.ridGenerator,
        opts.path,
        opts.timeout,
        opts.apiNameWrapper,
        opts.tlsAgentOptions,
        opts.retryConnReset,
    );
}
