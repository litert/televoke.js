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

import type * as Listener from '../http-listener';
import type * as Http from 'node:http';
import type * as dT from '../Transporter.decl';
import * as Shared from '../../shared';
import { EventEmitter } from 'node:events';
import { LegacyHttpTransporter } from './LegacyHttp.Transporter';
import * as v1 from '../../shared/Encodings/v1';

const encoder = new v1.TvEncoderV1();

const INVALID_REQUEST_RESPONSE = Buffer.from(encoder.encodeApiErrorResponse(
    'null',
    Shared.Encodings.v1.EResponseCode.MALFORMED_ARGUMENTS,
    '"INVALID REQUEST"',
    0
));

function refuseBadRequest(resp: Http.ServerResponse): void {

    try {

        resp.writeHead(400, {
            'content-length': INVALID_REQUEST_RESPONSE.byteLength,
        });
        const socket = resp.socket!;
        resp.end(INVALID_REQUEST_RESPONSE);
        socket.destroy();
    }
    catch {

        // do nothing.
    }
}

export interface IHttpGatewayOptions {

    hostname?: string;

    port?: number;

    backlog?: number;
}

export interface IRegisterListenerOptions {

    onErrorCallback: (e: Error) => void;

    onRequestCallback: (req: Http.IncomingMessage, resp: Http.ServerResponse) => void;
}

export interface IRegisterListenerResult {

    stop?: () => void | Promise<void>;

    start?: () => void | Promise<void>;

    readonly running: boolean;
}

class LegacyHttpGateway extends EventEmitter implements dT.IGateway {

    private readonly _listener: IRegisterListenerResult;

    public constructor(
        registerListener: (opts: IRegisterListenerOptions) => IRegisterListenerResult,
        private readonly _server: dT.IServer,
    ) {

        super();

        if (this._server.router.encoding !== 'json') {

            throw new TypeError('Legacy HTTP gateway only supports JSON encoding');
        }

        this._listener = registerListener({
            onErrorCallback: (e) => this.emit('error', e),
            onRequestCallback: this._onRequest,
        });
    }

    private _sendResponse(resp: Http.ServerResponse, data: string): void {

        try {

            resp.setHeader('content-length', Buffer.byteLength(data));
            resp.end(data);
        }
        catch (e) {

            this.emit('error', e);
        }
    }

    public get running(): boolean {

        return this._listener.running;
    }

    private readonly _onRequest = (req: Http.IncomingMessage, resp: Http.ServerResponse): void => {

        if (req.method !== 'POST' || !req.headers['content-length']) {

            refuseBadRequest(resp);
            this.emit('error', new Shared.errors.invalid_packet({
                reason: 'invalid_request',
                data: {
                    'method': req.method,
                    'headers': req.headers,
                    'url': req.url,
                },
            }));
            return;
        }

        const length = parseInt(req.headers['content-length']);

        if (!Number.isSafeInteger(length) || length > v1.MAX_PACKET_SIZE) { // Maximum request packet is 64MB

            refuseBadRequest(resp);
            this.emit('error', new Shared.errors.invalid_packet({
                reason: 'invalid_packet_length',
                data: {
                    'length': length,
                    'max': v1.MAX_PACKET_SIZE,
                },
            }));
            return;
        }

        const buf: Buffer = Buffer.allocUnsafe(length);

        let offset: number = 0;

        const recvAt = Date.now();

        resp.on('error', (e) => this.emit('error', e));

        req.on('error', (e) => this.emit('error', e))
            .on('data', (chunk: Buffer) => {

                const index = offset;

                offset += chunk.byteLength;

                if (offset > length) {

                    refuseBadRequest(resp);
                    this.emit('error', new Shared.errors.invalid_packet({
                        reason: 'length_exceeded',
                        recv: offset,
                        expected: length,
                    }));
                    return;
                }

                chunk.copy(buf, index);
            })
            .on('end', () => {

                let input: any;

                if (offset !== length || buf[0] !== 123 || buf[offset - 1] !== 125) {

                    refuseBadRequest(resp);
                    return;
                }

                try {

                    input = JSON.parse(buf as any);
                }
                catch (e) {

                    refuseBadRequest(resp);
                    this.emit('error', new Shared.errors.invalid_packet({
                        reason: 'invalid_json',
                    }, e));
                    return;
                }

                if (typeof input?.api !== 'string') {

                    refuseBadRequest(resp);
                    this.emit('error', new Shared.errors.invalid_packet({
                        reason: 'malformed_json',
                    }));
                    return;
                }

                this._server.processLegacyApi((result) => {

                    if (!resp.writable) {

                        return;
                    }

                    if (result instanceof Shared.TelevokeError) {

                        if (result instanceof Shared.errors.app_error) {

                            this._sendResponse(resp, encoder.encodeApiErrorResponse(
                                input.rid,
                                v1.EResponseCode.FAILURE,
                                result.message,
                                recvAt
                            ));
                        }
                        else if (result instanceof Shared.errors.api_not_found) {

                            this._sendResponse(resp, encoder.encodeApiErrorResponse(
                                input.rid,
                                v1.EResponseCode.API_NOT_FOUND,
                                'null',
                                recvAt
                            ));
                        }
                        else if (result instanceof Shared.ProtocolError) {

                            this._sendResponse(resp, encoder.encodeApiErrorResponse(
                                input.rid,
                                v1.EResponseCode.SYSTEM_ERROR,
                                JSON.stringify({
                                    name: result.name,
                                    message: result.message,
                                    data: result.data,
                                }),
                                recvAt
                            ));
                        }
                        else {

                            this._sendResponse(resp, encoder.encodeApiErrorResponse(
                                input.rid,
                                v1.EResponseCode.SYSTEM_ERROR,
                                'null',
                                recvAt
                            ));
                        }

                        return;
                    }

                    let data: string;

                    try {

                        data = encoder.encodeApiOkResponse(input.rid, result ?? null, recvAt);
                    }
                    catch (e) {

                        data = encoder.encodeApiErrorResponse(
                            input.rid,
                            v1.EResponseCode.SYSTEM_ERROR,
                            'null',
                            recvAt
                        );

                        this.emit('error', new Shared.errors.unprocessable_error({ api: input.api }, e));
                    }

                    this._sendResponse(resp, data);

                }, input.api, input.args, new LegacyHttpTransporter(req));
            });
    };

    public async start(): Promise<void> {

        if (this.running) {

            return;
        }

        await this._listener.start?.();
    }

    public async stop(): Promise<void> {

        if (!this.running) {

            return Promise.resolve();
        }

        await this._listener.stop?.();
    }
}

/**
 * Create a legacy HTTP gateway, binding to a built-in simple HTTP server.
 *
 * > When using built-in HTTP server, the api will ignore headers, path and query string in the URL.
 *
 * @param listener  The built-in HTTP listener to bind to.
 * @param server    The server to process the requests.
 */
export function createLegacyHttpGateway(
    listener: Listener.IHttpListener,
    server: dT.IServer
): dT.IGateway {

    return new LegacyHttpGateway((o) => {
        listener.on('error', o.onErrorCallback);
        listener.setLegacyApiProcessor(o.onRequestCallback);
        return listener;
    }, server);
}

/**
 * Create a legacy HTTP gateway, binding to a custom HTTP server.
 *
 * > When using a custom HTTP server, it's able to preprocess the request before passing to the server, like
 * > authentication, rate limiting, etc.
 *
 * @param registerListener  The function to register the listener to the custom HTTP server.
 * @param server            The server to process the requests.
 */
export function createCustomLegacyHttpGateway(
    registerListener: (opts: IRegisterListenerOptions) => IRegisterListenerResult,
    server: dT.IServer
): dT.IGateway {

    return new LegacyHttpGateway(registerListener, server);
}
