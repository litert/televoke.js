import * as C from '../Common';
import * as G from '../../Common';
import * as E from '../Errors';
import * as $Net from 'net';
import { createEncoder } from '../../Encoder/Encoder';
import { createDecoder } from '../../Encoder/Decoder';

enum EStatus {

    IDLE,
    STARTING,
    WORKING,
    CLOSING,
}

enum EClientStatus {

    WORKING,
    CLOSING,
}

interface IClient {

    socket: $Net.Socket;

    decoder: G.IDecoder<G.IRawRequest>;

    status: EClientStatus;

    loads: number;
}

class TCPGateway implements C.IGateway {

    private _socket: $Net.Server = $Net.createServer(this._onConnect.bind(this));

    private _status: EStatus = EStatus.IDLE;

    private _clients: Record<string, IClient> = {};

    private _clientIdCounter: number = 0;

    public onError!: (e: unknown) => void;

    public onRequest!: (
        request: G.IRawRequest,
        reply: (data: any) => void
    ) => void;

    public constructor(
        private _host: string,
        private _port: number
    ) { }

    private _onConnect(socket: $Net.Socket): void {

        const clientId = this._clientIdCounter++;

        const encoder = createEncoder();
        const decoder = createDecoder<G.IRawRequest>();
        const client = {
            decoder,
            socket,
            status: EClientStatus.WORKING,
            loads: 0
        };

        decoder.onLogicError = decoder.onProtocolError = (e: unknown) => {

            delete this._clients[clientId];

            socket.destroy();

            this.onError(e);
        };

        decoder.onData = (data) => {

            client.loads++;

            this.onRequest(
                data,
                (content) => {

                    if (socket.writable) {

                        encoder.encode(socket, content);
                    }

                    if (!--client.loads && client.status === EClientStatus.CLOSING) {

                        socket.end();
                    }
                }
            );
        };

        this._clients[clientId] = client;

        socket.on('data', decoder.decode.bind(decoder)).on('end', () => {

            client.status = EClientStatus.CLOSING;
            delete this._clients[clientId];
        }).on(
            'close',
            () => delete this._clients[clientId]
        );
    }

    public async start(): Promise<void> {

        if (!this.onError || !this.onRequest) {

            throw new E.E_NO_SERVER_ATTACHED();
        }

        switch (this._status) {

            case EStatus.IDLE:

                this._status = EStatus.STARTING;

                return new Promise((resolve, reject) => {

                    this._socket.listen(this._port, this._host)
                        .once('listening', () => {

                            this._socket.removeAllListeners('error');
                            this._status = EStatus.WORKING;
                            resolve();
                        })
                        .once('error', (e) => {

                            this._socket.removeAllListeners('listening');
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

                    this._socket.close(() => resolve());

                    for (const clientId in this._clients) {

                        this._closeClient(clientId);
                    }
                });
        }
    }

    private _closeClient(clientId: string | number): void {

        if (this._clients[clientId].loads) {

            this._clients[clientId].decoder.onData = () => void 0;
            this._clients[clientId].status = EClientStatus.CLOSING;
        }
        else {

            this._clients[clientId].socket.end();
        }

        delete this._clients[clientId];
    }
}

export function createTCPGateway(host: string, port: number): C.IGateway {

    return new TCPGateway(host, port);
}
