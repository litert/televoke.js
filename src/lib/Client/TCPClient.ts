/**
 * Copyright 2020 Angus.Fenying <fenying@litert.org>
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

import * as $Net from 'net';
import * as C from './Common';
import * as G from '../Common';
import { Promises } from '@litert/observable';
import * as E from './Errors';
import { createDecoder } from '../Encoder/Decoder';
import { createEncoder } from '../Encoder/Encoder';

enum EStatus {

    IDLE,
    CONNECTING,
    CLOSING,
    WORKING,
}

interface IRequest {

    api: string;

    cst: number;

    returnRaw: boolean;

    pr: Promises.IPromiseHandle;

    timer?: NodeJS.Timeout;

    packet?: G.IRawRequest;
}

class TCPClient implements C.IClient {

    private static _promises = Promises.getGlobalFactory();

    private static _clientCounter = 0;

    private _socket!: $Net.Socket;

    private _status: EStatus = EStatus.IDLE;

    private _clientId: number = TCPClient._clientCounter++;

    private _connPrId: string;

    private _closePrId: string;

    private _sent: Record<string, IRequest> = {};

    private _sentQty: number = 0;

    private _sending: Record<string, IRequest> = {};

    private _sendingQty: number = 0;

    private _encoder = createEncoder();

    public onError!: (e: unknown) => void;

    public constructor(
        private _host: string,
        private _port: number,
        private _ridGenerator: C.IRIDGenerator,
        private _timeout: number = 30000
    ) {

        this._connPrId = `litert:televoke:tcp:client:${this._clientId}:connect`;
        this._closePrId = `litert:televoke:tcp:client:${this._clientId}:close`;
    }

    public invoke(api: any, ...args: any[]): Promise<any> {

        return this._call(api, false, args);
    }

    public call(api: any, ...args: any[]): Promise<any> {

        return this._call(api, true, args);
    }

    private _call(api: any, returnRaw: boolean, args: any[]): Promise<any> {

        const rid = this._ridGenerator();

        let pr: Promises.IPromiseHandle;

        switch (this._status) {

            case EStatus.IDLE:
                return Promise.reject(new E.E_CONN_NOT_READY());
            case EStatus.WORKING: {
                const NOW = Date.now();
                this._encoder.encode(this._socket, {
                    ttl: this._timeout,
                    rid,
                    cst: NOW,
                    args,
                    api
                });
                this._sentQty++;
                this._sent[rid] = {
                    api,
                    cst: NOW,
                    returnRaw,
                    pr: pr = TCPClient._promises.createPromise(),
                    timer: this._timeout > 0 ? setTimeout(() => {

                        const req = this._sent[rid];

                        if (req) {

                            delete this._sent[rid];
                            this._sentQty--;
                            req.pr.reject(new E.E_REQUEST_TIMEOUT({
                                metadata: { api: req.api, requestId: rid, time: req.cst, details: null }
                            }));
                        }

                        if (this._status === EStatus.CLOSING && !this._sentQty) {

                            this._socket.destroy();
                            this._status = EStatus.IDLE;
                        }

                    }, this._timeout) : undefined
                };
                break;
            }
            case EStatus.CONNECTING: {
                const NOW = Date.now();
                this._sendingQty++;
                this._sending[rid] = {
                    api,
                    pr: pr = TCPClient._promises.createPromise(),
                    cst: NOW,
                    returnRaw,
                    packet: {
                        ttl: this._timeout,
                        rid,
                        cst: NOW,
                        args,
                        api
                    },
                    timer: this._timeout > 0 ? setTimeout(() => {

                        let req = this._sent[rid];

                        if (req) {

                            delete this._sent[rid];

                            this._sentQty--;

                            req.pr.reject(new E.E_REQUEST_TIMEOUT({
                                metadata: { api: req.api, requestId: rid, time: req.cst, details: null }
                            }));

                            if (this._status === EStatus.CLOSING && !this._sentQty) {

                                this._socket.destroy();
                                this._status = EStatus.IDLE;
                            }

                            return;
                        }

                        req = this._sending[rid];

                        if (req) {

                            delete this._sending[rid];

                            this._sendingQty--;

                            req.pr.reject(new E.E_REQUEST_TIMEOUT({
                                metadata: { api: req.api, requestId: rid, time: req.cst, details: null }
                            }));

                            if (this._status === EStatus.CLOSING && !this._sentQty) {

                                this._socket.destroy();
                                this._status = EStatus.IDLE;
                            }
                        }

                    }, this._timeout) : undefined
                };

                break;
            }
            case EStatus.CLOSING:
                throw new E.E_CONN_CLOSING();
        }

        return pr.promise;
    }

    public connect(): Promise<void> {

        switch (this._status) {

            case EStatus.WORKING:
                return Promise.resolve();
            case EStatus.CONNECTING:
                return TCPClient._promises.findPromise(this._connPrId)!.promise;
            case EStatus.CLOSING:
                this._status = EStatus.WORKING;
                break;
            case EStatus.IDLE:
                break;
        }

        this._socket = $Net.connect({
            host: this._host,
            port: this._port
        });

        const pr = TCPClient._promises.createPromise({ id: this._connPrId });

        this._socket.once('connect', () => {

            this._status = EStatus.WORKING;

            this._socket.removeAllListeners('error');

            const decoder = createDecoder<G.IRawResponse>();

            decoder.onLogicError = this.onError;
            decoder.onProtocolError = this.onError;

            decoder.onData = (rawData: G.IRawResponse): void => {

                const data = rawData as C.IResponse<any>;

                const req = this._sent[data.rid];

                if (!req) {

                    return;
                }
                data.cst = req.cst;
                data.crt = Date.now();

                this._sentQty--;
                delete this._sent[data.rid];

                if (req.timer) {

                    clearTimeout(req.timer);
                }

                if (this._status === EStatus.CLOSING && !this._sentQty) {

                    this._socket.end();
                    this._status = EStatus.IDLE;
                }

                switch (data.code) {
                    case G.EResponseCode.OK:
                        req.pr.resolve(req.returnRaw ? data : data.body);
                        break;
                    case G.EResponseCode.SYSTEM_ERROR:
                        req.pr.reject(new E.E_SERVER_INTERNAL_ERROR({
                            metadata: { api: req.api, requestId: data.rid, time: data.srt, details: data }
                        }));
                        break;
                    case G.EResponseCode.FAILURE:
                        req.pr.reject(new E.E_SERVER_LOGIC_FAILURE({
                            metadata: { api: req.api, requestId: data.rid, time: data.srt, details: data }
                        }));
                        break;
                    case G.EResponseCode.API_NOT_FOUND:
                        req.pr.reject(new E.E_API_NOT_FOUND({
                            metadata: { api: req.api, requestId: data.rid, time: data.srt, details: data }
                        }));
                        break;
                    default:
                        req.pr.reject(new E.E_SERVER_UNKNOWN_ERROR({
                            metadata: { api: req.api, requestId: data.rid, time: data.srt, details: data }
                        }));
                        break;
                }
            };

            this._socket.on('data', decoder.decode.bind(decoder)).on('end', () => {

                if (this._sentQty) {

                    const ls = this._sent;

                    this._sent = {};

                    for (const rid in ls) {

                        this._sent[rid].pr.reject(new E.E_CONN_LOST());
                    }

                    this._sentQty = 0;
                }
            });

            if (this._sendingQty) {

                for (const rid in this._sending) {

                    const req = this._sending[rid];

                    this._encoder.encode(this._socket, req.packet);

                    this._sent[rid] = req;
                    this._sentQty++;
                    delete req.packet;
                }

                this._sending = {};
                this._sendingQty = 0;
            }

            pr.resolve();

        }).once('error', (e) => {

            delete this._socket;
            pr.reject(e);
        });

        return pr.promise;
    }

    public close(): Promise<void> {

        switch (this._status) {

            case EStatus.IDLE:
                return Promise.resolve();
            case EStatus.CLOSING:
                return TCPClient._promises.findPromise(this._closePrId)!.promise;
            case EStatus.WORKING:
                break;
            case EStatus.CONNECTING:
                TCPClient._promises.findPromise(this._connPrId)!.reject(new E.E_OPERATION_ABORTED());
        }

        if (this._sentQty) {

            this._status = EStatus.CLOSING;

            return TCPClient._promises.createPromise({ id: this._closePrId }).promise;
        }

        if (this._sendingQty) {

            for (const rid in this._sending) {

                const req = this._sending[rid];

                req.pr.reject(new E.E_CONN_LOST({
                    metadata: { api: req.api, requestId: rid, time: Date.now(), details: null }
                }));
            }

            this._sending = {};
        }

        this._socket.destroy();
        delete this._socket;
        this._status = EStatus.IDLE;
        return Promise.resolve();
    }
}

export function createTCPClient<S extends G.IServiceAPIs>(
    host: string,
    port: number,
    ridGenerator: C.IRIDGenerator,
    timeout?: number
): C.IClient<S> {

    return new TCPClient(host, port, ridGenerator, timeout);
}
