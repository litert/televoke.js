/**
 * Copyright 2021 Angus.Fenying <fenying@litert.org>
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

    private _agent: $Https.Agent;

    public onError!: any;

    public constructor(
        private _host: string,
        private _port: number,
        private _ridGenerator: C.IRIDGenerator,
        private _path: string = '',
        private _timeout: number = 30000,
        private _apiNameWrapper?: (name: string) => string,
        tlsAgentOptions?: $Https.AgentOptions
    ) {

        super();

        this._agent = new $Https.Agent({
            maxSockets: 0,
            keepAlive: true,
            keepAliveMsecs: 30000,
            // servername: _host,
            ...tlsAgentOptions
        });
    }

    public invoke(api: any, ...args: any[]): Promise<any> {

        return this._call(api, false, args);
    }

    public call(api: any, ...args: any[]): Promise<any> {

        return this._call(api, true, args);
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

                return reject(new GE.E_PACKET_TOO_LARGE());
            }

            const req = $Https.request({
                port: this._port,
                host: this._host,
                path: this._path,
                agent: this._agent,
                method: 'POST',
                headers: {
                    'content-length': Buffer.byteLength(content)
                },
                timeout: this._timeout
            }, (resp) => {

                if (!resp.headers['content-length']) {

                    return reject(new E.E_INVALID_RESPONSE());
                }

                const length = parseInt(resp.headers['content-length']);

                if (!Number.isSafeInteger(length) || length > G.MAX_PACKET_SIZE) { // Maximum request packet is 64MB

                    return reject(new GE.E_PACKET_TOO_LARGE());
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

                        return reject(new GE.E_INVALID_PACKET());
                    }

                    chunk.copy(buf, index);

                }).on('end', () => {

                    let rawData: any;

                    try {

                        rawData = JSON.parse(buf as any);
                    }
                    catch {

                        return reject(new GE.E_INVALID_PACKET());
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

            req.once('timeout', () => reject(new E.E_REQUEST_TIMEOUT({
                metadata: { api, requestId: rid, time: Date.now(), details: null }
            })));

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
}

export function createHttpsClient<TAPIs extends G.IServiceAPIs>(opts: IHttpsClientOptions): C.IClient<TAPIs> {

    return new HttpsClient(
        opts.host,
        opts.port ?? 443,
        opts.ridGenerator,
        opts.path,
        opts.timeout,
        opts.apiNameWrapper,
        opts.tlsAgentOptions
    );
}
