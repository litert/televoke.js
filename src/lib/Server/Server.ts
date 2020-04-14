import * as C from './Common';
import * as G from '../Common';
import * as E from './Errors';
import * as L from '@litert/core';
import { Request } from './Request';
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

            const handler = this._router.route(rawReq.api);

            const req = new Request(rawReq, reply);

            if (!handler) {

                return reply({
                    rid: rawReq.rid,
                    rat: req.receivedAt,
                    sat: req.receivedAt,
                    code: G.EResponseCode.API_NOT_FOUND,
                    body: null
                });
            }

            try {

                const result = handler(req);

                if (result instanceof Promise) {

                    result.catch((e) => this.emit('handler_error', e));
                }
            }
            catch (e) {

                reply({
                    rid: rawReq.rid,
                    rat: req.receivedAt,
                    sat: req.receivedAt,
                    code: G.EResponseCode.API_NOT_FOUND,
                    body: null
                });

                this.emit('handler_error', e);
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

                    const successIndex = (await L.Async.multiTasks(gateways.map(
                        (k) => this._gateways[k].start()
                    ))).map(
                        (v, i) => v.success ? i : -1
                    ).filter(
                        (v) => v !== -1
                    );

                    if (successIndex.length !== gateways.length) {

                        for (const k of successIndex) {

                            await this._gateways[k].close();
                        }
                    }

                    this._status = EStatus.WORKING;
                }
                catch (e) {

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

    public async close(): Promise<void> {

        switch (this._status) {
            case EStatus.WORKING: {

                this._status = EStatus.CLOSING;

                try {

                    await L.Async.multiTasks(Object.values(this._gateways).map((k) => k.close()));

                    this._status = EStatus.IDLE;
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
