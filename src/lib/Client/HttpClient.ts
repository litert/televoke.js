import * as $Http from 'http';
import * as C from './Common';
import * as GE from '../Errors';
import * as G from '../Common';
import * as E from './Errors';

class HttpClient implements C.IClient {

    private _agent: $Http.Agent;

    public constructor(
        private _host: string,
        private _port: number,
        private _ridGenerator: C.IRIDGenerator,
        private _timeout: number = 30000
    ) {

        this._agent = new $Http.Agent({
            maxSockets: 0,
            keepAlive: true,
            keepAliveMsecs: 30000
        });
    }

    public invoke(api: any, args: any, timeout: number = this._timeout): Promise<any> {

        const rid = this._ridGenerator();

        const content = JSON.stringify({
            ttl: timeout,
            rid,
            sat: Date.now(),
            args,
            api
        });

        return new Promise((resolve, reject) => {

            const length = Buffer.byteLength(content);

            if (length > 67108864) {

                return reject(new GE.E_PACKET_TOO_LARGE());
            }

            const req = $Http.request({
                port: this._port,
                host: this._host,
                path: '',
                agent: this._agent,
                method: 'POST',
                headers: {
                    'content-length': Buffer.byteLength(content)
                },
                timeout
            }, (resp) => {

                if (!resp.headers['content-length']) {

                    return reject(new E.E_INVALID_RESPONSE());
                }

                const length = parseInt(resp.headers['content-length']);

                if (!Number.isSafeInteger(length) || length > 67108864) { // Maximum request packet is 64MB

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

                    let data: any;

                    try {

                        data = JSON.parse(buf as any);
                    }
                    catch {

                        return reject(new GE.E_INVALID_PACKET());
                    }

                    switch (data.code) {
                        case G.EResponseCode.OK:
                            resolve(data.body);
                            break;
                        case G.EResponseCode.SYSTEM_ERROR:
                            reject(new E.E_SERVER_INTERNAL_ERROR({
                                metadata: { api, requestId: data.rid, time: data.rat, details: data.body }
                            }));
                            break;
                        case G.EResponseCode.FAILURE:
                            reject(new E.E_SERVER_LOGIC_FAILURE({
                                metadata: { api, requestId: data.rid, time: data.rat, details: data.body }
                            }));
                            break;
                        case G.EResponseCode.API_NOT_FOUND:
                            reject(new E.E_API_NOT_FOUND({
                                metadata: { api, requestId: data.rid, time: data.rat, details: data.body }
                            }));
                            break;
                        default:
                            reject(new E.E_SERVER_UNKNOWN_ERROR({
                                metadata: { api, requestId: data.rid, time: data.rat, details: data.body }
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

export function createHttpClient(host: string, port: number, ridGenerator: C.IRIDGenerator, timeout?: number): C.IClient {

    return new HttpClient(host, port, ridGenerator, timeout);
}
