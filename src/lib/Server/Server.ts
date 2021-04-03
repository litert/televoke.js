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

import * as C from './Common';
import * as G from '../Common';
import * as E from './Errors';
import { Events } from '@litert/observable';

enum EStatus {

    IDLE,
    STARTING,
    WORKING,
    CLOSING,
}

class Server extends Events.EventEmitter<C.IServerEvents> implements C.IServer {

    private _gateways: Record<string, C.IGateway> = {};

    private _router!: C.IRouter;

    private _status: EStatus = EStatus.IDLE;

    public addGateway(name: string, gateway: C.IGateway): this {

        if (this._status !== EStatus.IDLE) {

            throw new E.E_SERVER_BUSY();
        }

        this._gateways[name] = gateway;

        if (gateway.onError || gateway.onRequest) {

            throw new E.E_GATEWAY_BUSY();
        }

        gateway.onError = (e) => this.emit('error', e);
        gateway.onRequest = (rawReq, reply) => {

            const req = rawReq as C.IRequest;

            req.srt = Date.now();

            const handler = this._router.route(rawReq.api);

            if (!handler) {

                return reply({
                    rid: req.rid,
                    srt: req.srt,
                    sst: Date.now(),
                    code: G.EResponseCode.API_NOT_FOUND,
                    body: null
                });
            }

            if (!this._router.validate(req, handler)) {

                return reply({
                    rid: req.rid,
                    srt: req.srt,
                    sst: Date.now(),
                    code: G.EResponseCode.MALFORMED_ARGUMENTS,
                    body: null
                });
            }

            let resultPr: any;

            try {

                resultPr = this._router.execute(req, handler);
            }
            catch (e) {

                reply({
                    rid: req.rid,
                    srt: req.srt,
                    sst: Date.now(),
                    code: G.EResponseCode.FAILURE,
                    body: e ?? null
                });

                return;
            }

            if (resultPr instanceof Promise) {

                resultPr.then((body) => reply({
                    rid: req.rid,
                    srt: req.srt,
                    sst: Date.now(),
                    code: G.EResponseCode.OK,
                    body: body ?? null
                }), (body) => reply({
                    rid: req.rid,
                    srt: req.srt,
                    sst: Date.now(),
                    code: G.EResponseCode.FAILURE,
                    body: body ?? null
                }));
            }
            else {
                reply({
                    rid: req.rid,
                    srt: req.srt,
                    sst: Date.now(),
                    code: G.EResponseCode.OK,
                    body: resultPr ?? null
                });
            }
        };

        return this;
    }

    public removeGateway(name: string): this {

        if (this._status !== EStatus.IDLE) {

            throw new E.E_SERVER_BUSY();
        }

        const gateway = this._gateways[name];

        if (gateway) {

            delete this._gateways[name];

            delete gateway.onRequest;
            delete gateway.onError;
        }

        return this;
    }

    public setRouter(router: C.IRouter): this {

        if (this._status !== EStatus.IDLE) {

            throw new E.E_SERVER_BUSY();
        }

        this._router = router;
        return this;
    }

    public async start(): Promise<void> {

        if (!this.listenerCount('error')
            || !this.listenerCount('handler_error')
            || !this._router
            || !Object.values(this._gateways).length
        ) {

            throw new E.E_SERVER_NOT_READY();
        }

        switch (this._status) {
            case EStatus.IDLE: {

                this._status = EStatus.STARTING;

                try {

                    const gateways = Object.keys(this._gateways);

                    await Promise.all(gateways.map(
                        (k) => this._gateways[k].start()
                    ));

                    this._status = EStatus.WORKING;
                }
                catch (e) {

                    await this._doClose();
                    this._status = EStatus.IDLE;
                    throw e;
                }

                break;
            }
            case EStatus.STARTING:
                throw new E.E_SERVER_STARTING();
            case EStatus.CLOSING:
                throw new E.E_SERVER_CLOSING();
            case EStatus.WORKING:
                return;
        }
    }

    private async _doClose(): Promise<void> {

        await Promise.all(Object.values(this._gateways).map((k) => k.close()));

        this._status = EStatus.IDLE;
    }

    public async close(): Promise<void> {

        switch (this._status) {
            case EStatus.WORKING: {

                this._status = EStatus.CLOSING;

                try {

                    await this._doClose();
                }
                catch (e) {

                    this._status = EStatus.WORKING;
                    throw e;
                }

                break;
            }
            case EStatus.STARTING:
                throw new E.E_SERVER_STARTING();
            case EStatus.CLOSING:
                throw new E.E_SERVER_CLOSING();
            case EStatus.IDLE:
                return;
        }
    }
}

export function createServer(): C.IServer {

    return new Server();
}
