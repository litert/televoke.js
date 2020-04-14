import * as E from './Errors';
import * as GE from '../Errors';
import * as C from '../Common';

class Decoder implements C.IDecoder<any> {

    public onData!: (data: any) => void;

    /**
     * When this event triggered, shutdown the socket.
     */
    public onProtocolError!: (e: unknown) => void;

    /**
     * When this event triggered, an unexpected exception thrown from server.
     */
    public onLogicError!: (e: unknown) => void;

    private _buf!: Buffer;

    private _bufLength!: number;

    private _packetLength!: number;

    public constructor() {

        this._buf = Buffer.allocUnsafe(65536);

        this.reset();
    }

    public reset(): void {

        this._bufLength = 0;

        this._packetLength = 0;
    }

    public decode(chunk: Buffer): void {

        while (1) {

            if (!chunk.length) {

                break;
            }

            if (this._packetLength) {

                if (!this._bufLength && chunk.length >= this._packetLength) {

                    let data: any;

                    try {

                        data = JSON.parse(chunk.slice(0, this._packetLength).toString());
                    }
                    catch (e) {

                        this.reset();
                        this.onProtocolError(e);
                        return;
                    }

                    chunk = chunk.slice(this._packetLength);
                    this.reset();

                    try {

                        this.onData(data);
                    }
                    catch (e) {

                        this.onLogicError(e);
                    }

                    continue;
                }

                if (chunk.length + this._bufLength >= this._packetLength) {

                    let restLength = this._packetLength - this._bufLength;
                    chunk.copy(this._buf, this._bufLength, 0, this._packetLength - this._bufLength);
                    chunk = chunk.slice(restLength);

                    let data: any;

                    try {

                        data = JSON.parse(this._buf.slice(0, this._packetLength).toString());
                    }
                    catch (e) {

                        this.reset();
                        this.onProtocolError(e);
                        return;
                    }

                    this.reset();

                    try {

                        this.onData(data);
                    }
                    catch (e) {

                        this.onLogicError(e);
                    }
                }
                else {

                    chunk.copy(this._buf, this._bufLength);
                    this._bufLength += chunk.length;
                    return;
                }
            }
            else {

                /**
                 * Accept at least 4 bytes as the leading packet.
                 */
                if (chunk.length < 4) {

                    this.onProtocolError(new E.E_INVALID_LEADING_PACKET());
                    this.reset();
                    return;
                }

                this._packetLength = chunk.readUInt32LE(0);

                if (this._packetLength > 67108864) { // Maximum packet size is 64M

                    this.onProtocolError(new GE.E_PACKET_TOO_LARGE());
                    this.reset();
                }

                chunk = chunk.slice(4);

                if (this._buf.byteLength < this._packetLength) {

                    this._buf = Buffer.allocUnsafe(this._packetLength);
                }
            }
        }
    }
}

export function createDecoder<T>(): C.IDecoder<T> {

    return new Decoder();
}
