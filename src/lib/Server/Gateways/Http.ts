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

import * as $Net from 'net';
import * as C from '../Common';
import * as G from '../../Common';
import * as E from '../Errors';
import * as $Http from 'http';

enum EStatus {

    IDLE,
    STARTING,
    WORKING,
    CLOSING,
}

const INVALID_REQUEST_RESPONSE = Buffer.from('{"rid":"null","body":"INVALID REQUEST","sst":1698886839989,"srt":0,"code":4}');

function refuseBadRequest(resp: $Http.ServerResponse): void {

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

class HttpGateway implements C.IGateway {

    private readonly _server: $Http.Server = $Http.createServer(this._onRequest.bind(this));

    private _status: EStatus = EStatus.IDLE;

    public onError!: (e: unknown) => void;

    public onRequest!: (
        request: G.IRawRequest,
        reply: (data: any) => void
    ) => void;

    public constructor(
        public host: string,
        public port: number,
        private readonly _backlog?: number,
    ) { }

    private _onRequest(req: $Http.IncomingMessage, resp: $Http.ServerResponse): void {

        if (req.method !== 'POST' || !req.headers['content-length']) {

            refuseBadRequest(resp);
            return;
        }

        const length = parseInt(req.headers['content-length']);

        if (!Number.isSafeInteger(length) || length > G.MAX_PACKET_SIZE) { // Maximum request packet is 64MB

            refuseBadRequest(resp);
            return;
        }

        const buf: Buffer = Buffer.allocUnsafe(length);

        let offset: number = 0;

        resp.on('error', this.onError);

        req.on('error', this.onError).on('data', (chunk: Buffer) => {

            const index = offset;

            offset += chunk.byteLength;

            if (offset > length) {

                req.removeAllListeners('end');
                req.removeAllListeners('data');
                refuseBadRequest(resp);
                return;
            }

            chunk.copy(buf, index);
        }).on('end', () => {

            let input: any;

            if (offset !== length || buf[0] !== 123 || buf[offset - 1] !== 125) {

                refuseBadRequest(resp);
                return;
            }

            try {

                input = JSON.parse(buf as any);
                input.ip = (req.socket.address() as any).address;
            }
            catch (e) {

                refuseBadRequest(resp);
                this.onError(e);
                return;
            }

            this.onRequest(
                input,
                (content) => {

                    if (resp.writable) {

                        const data = JSON.stringify(content);

                        resp.setHeader('content-length', Buffer.byteLength(data));
                        resp.end(data);
                    }
                }
            );
        });
    }

    public async start(): Promise<void> {

        if (!this.onError || !this.onRequest) {

            throw new E.E_NO_SERVER_ATTACHED();
        }

        switch (this._status) {

            case EStatus.IDLE:

                this._status = EStatus.STARTING;

                return new Promise((resolve, reject) => {

                    this._server.listen(this.port, this.host, this._backlog)
                        .once('listening', () => {

                            this._server.removeAllListeners('error');
                            this._status = EStatus.WORKING;
                            if (this.port === 0) {

                                this.port = (this._server.address() as $Net.AddressInfo).port;
                            }
                            resolve();
                        })
                        .once('error', (e) => {

                            this._server.removeAllListeners('listening');
                            this._status = EStatus.IDLE;
                            reject(e);
                        });
                });

            case EStatus.STARTING:
                throw new E.E_GATEWAY_STARTING();
            case EStatus.CLOSING:
                throw new E.E_GATEWAY_CLOSING();
            case EStatus.WORKING:
                return;
        }
    }

    public async close(): Promise<void> {

        switch (this._status) {

            case EStatus.IDLE:
                return;
            case EStatus.STARTING:
                throw new E.E_GATEWAY_STARTING();
            case EStatus.CLOSING:
                throw new E.E_GATEWAY_CLOSING();
            case EStatus.WORKING:
                return new Promise((resolve) => {

                    this._server.close(() => { resolve(); });
                });
        }
    }
}

export function createHttpGateway(host: string, port: number, backlog?: number): C.IGateway {

    return new HttpGateway(host, port, backlog);
}
