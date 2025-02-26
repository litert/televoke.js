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

import * as $Http from 'http';
import * as $Https from 'https';
import type * as C from '../../client/Client.decl';
import * as Shared from '../../shared';
import * as v1 from '../../shared/Encodings/v1';
import { EventEmitter } from 'node:events';

const HTTP_HEADER_CONTENT_LENGTH = 'content-length';
const HTTP_HEADER_TV_VER = 'x-tv-ver';

const DEFAULT_MAX_CONNECTIONS = 100;
const DEFAULT_TIMEOUT = 30_000;

const disabledStreamManager = Shared.createDisabledStreamManagerFactory()(null as any);

export interface ILegacyHttpClient<T extends Shared.IObject> extends C.IClient<T> {

    /**
     * Setup the headers for the every HTTP request.
     *
     * @param newHeaders    The new headers to set.
     * @param append        Whether to append the new headers to existing headers, or replace all headers. [Default: true]
     */
    setHeaders(newHeaders: $Http.OutgoingHttpHeaders, append?: boolean): void;
}

class TvLegacyHttpClient extends EventEmitter implements ILegacyHttpClient<any> {

    public onError!: any;

    public constructor(
        private readonly _request: (opts: any, cb: (resp: $Http.IncomingMessage) => void) => $Http.ClientRequest,
        private readonly _opts: $Https.RequestOptions,
        private readonly _agent: $Http.Agent,
        private readonly _retryOnConnReset: boolean = true,
        private readonly _apiNameWrapper?: (name: string) => string,
    ) {

        super();

        this._opts.headers ??= {};
    }

    public get timeout(): number {

        return this._opts.timeout ?? DEFAULT_TIMEOUT;
    }

    public get streams(): Shared.IStreamManager {

        return disabledStreamManager;
    }

    public readonly writable: boolean = true;

    public readonly ended: boolean = false;

    public readonly finished: boolean = false;

    public readonly transporter = null;

    public setHeaders(newHeaders: $Http.OutgoingHttpHeaders, append: boolean = true): void {

        if (append) {

            Object.assign(this._opts.headers!, newHeaders);
        }
        else {

            this._opts.headers = newHeaders;
        }
    }

    public sendBinaryChunk(): Promise<void> {

        return Promise.reject(new Shared.errors.cmd_not_impl());
    }

    public sendMessage(): Promise<void> {

        return Promise.reject(new Shared.errors.cmd_not_impl());
    }

    public ping(): Promise<Buffer> {

        return Promise.reject(new Shared.errors.cmd_not_impl());
    }

    public async invoke(api: any, ...args: any[]): Promise<any> {

        try {

            return await this._invoke(api, ...args);
        }
        catch (e) {

            if (this._retryOnConnReset && (e as any)?.code === 'ECONNRESET') {

                return this._invoke(api, ...args);
            }
            else {

                throw e;
            }
        }
    }

    private _invoke(api: any, ...args: any[]): Promise<any> {

        const CST = Date.now();

        const content = JSON.stringify({
            ttl: this._opts.timeout ?? DEFAULT_TIMEOUT,
            rid: 0,
            cst: CST,
            args,
            api: this._apiNameWrapper?.(api) ?? api
        });

        return new Promise((resolve, reject) => {

            const length = Buffer.byteLength(content);

            if (length > v1.MAX_PACKET_SIZE) {

                reject(new Shared.errors.invalid_packet({ reason: 'packet_too_large' }));
                return;
            }

            const req = this._request({
                ...this._opts,
                agent: this._agent,
                method: 'POST',
                headers: {
                    ...this._opts.headers,
                    [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(content),
                    [HTTP_HEADER_TV_VER]: 1
                },
            }, (resp) => {

                if (resp.statusCode !== 200) {

                    resp.socket.destroy();
                    reject(new Shared.errors.invalid_response({
                        reason: 'invalid_status_code',
                        statusCode: resp.statusCode
                    }));
                    return;
                }

                if (!resp.headers[HTTP_HEADER_CONTENT_LENGTH]) {

                    resp.socket.destroy();
                    reject(new Shared.errors.invalid_response({ reason: 'missing_content_length' }));
                    return;
                }

                const length = parseInt(resp.headers[HTTP_HEADER_CONTENT_LENGTH]);

                if (!Number.isSafeInteger(length) || length > v1.MAX_PACKET_SIZE) { // Maximum request packet is 64MB

                    resp.socket.destroy();
                    reject(new Shared.errors.invalid_packet({ reason: 'packet_too_large' }));
                    return;
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

                        reject(new Shared.errors.invalid_packet({ reason: 'packet_length_mismatched' }));
                        return;
                    }

                    chunk.copy(buf, index);

                }).on('end', () => {

                    let data: v1.IResponsePayloadV1;

                    try {

                        data = JSON.parse(buf as any);
                    }
                    catch (e) {

                        reject(new Shared.errors.invalid_response({
                            reason: 'invalid_json',
                            raw: buf
                        }, e));
                        return;
                    }

                    switch (data.code) {
                        case v1.EResponseCode.OK:
                            resolve(data.body);
                            break;
                        case v1.EResponseCode.FAILURE:
                            reject(new Shared.TvErrorResponse(data.body));
                            break;
                        case v1.EResponseCode.API_NOT_FOUND:
                            reject(new Shared.errors.api_not_found({ api }));
                            break;
                        case v1.EResponseCode.MALFORMED_ARGUMENTS:
                        case v1.EResponseCode.SYSTEM_ERROR:
                        default:
                            reject(new Shared.errors.server_internal_error({
                                api, ...data
                            }));
                            break;
                    }
                });
            });

            req.once('timeout', () => {
                reject(new Shared.errors.timeout({
                    metadata: { api, time: Date.now(), details: null }
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

interface IHttpClientOptionsBase extends $Https.RequestOptions {

    /**
     * Whether to use HTTPS.
     *
     * @default false
     */
    https?: boolean;

    /**
     * Wrap the API name before sending to server.
     *
     * @default null
     */
    apiNameWrapper?: (name: string) => string;

    /**
     * Whether to retry on connection reset.
     *
     * @default true
     */
    retryOnConnReset?: boolean;

    /**
     * The maximum number of connections.
     *
     * @default 100
     */
    maxConnections?: number;

    /**
     * The timeout of keep-alive.
     *
     * @default 30000
     */
    keepAliveTimeout?: number;

    /**
     * Whether to keep-alive.
     *
     * @default true
     */
    keepAlive?: boolean;
}

export interface IHttpClientNetworkOptions extends IHttpClientOptionsBase {

    /**
     * The hostname of HTTP server.
     *
     * @default 'localhost'
     */
    hostname: string;

    /**
     * The port of HTTP server.
     *
     * @default 80 or 443
     */
    port?: number;
}

export interface IHttpClientUnixSocketOptions extends IHttpClientOptionsBase {

    /**
     * The path of Unix domain socket to connect to.
     */
    socketPath: string;
}

export type IHttpClientOptions = IHttpClientNetworkOptions | IHttpClientUnixSocketOptions;

export function createLegacyHttpClient<TAPIs extends Shared.IObject>(
    opts: IHttpClientOptions,
): ILegacyHttpClient<TAPIs> {

    return new TvLegacyHttpClient(
        opts.https ? $Https.request : $Http.request,
        opts,
        opts.https ? new $Https.Agent({
            'maxSockets': opts.maxConnections ?? DEFAULT_MAX_CONNECTIONS,
            'keepAlive': opts.keepAlive ?? true,
            'keepAliveMsecs': opts.keepAliveTimeout ?? DEFAULT_TIMEOUT
        }) : new $Http.Agent({
            'maxSockets': opts.maxConnections ?? DEFAULT_MAX_CONNECTIONS,
            'keepAlive': opts.keepAlive ?? true,
            'keepAliveMsecs': opts.keepAliveTimeout ?? DEFAULT_TIMEOUT
        }),
        opts.retryOnConnReset,
        opts.apiNameWrapper,
    );
}
