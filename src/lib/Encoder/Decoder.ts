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

    private readonly _plBuf: Buffer = Buffer.allocUnsafe(8);

    private _plBufLength: number = 0;

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

                        data = JSON.parse(chunk.subarray(0, this._packetLength).toString());
                    }
                    catch (e) {

                        this.reset();
                        this.onProtocolError(e);
                        return;
                    }

                    chunk = chunk.subarray(this._packetLength);
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

                    const restLength = this._packetLength - this._bufLength;
                    chunk.copy(this._buf, this._bufLength, 0, this._packetLength - this._bufLength);
                    chunk = chunk.subarray(restLength);

                    let data: any;

                    try {

                        data = JSON.parse(this._buf.subarray(0, this._packetLength).toString());
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

                if (this._plBufLength) {

                    if (this._plBufLength + chunk.byteLength >= 8) {

                        chunk.copy(this._plBuf, this._plBufLength, 0, 8 - this._plBufLength);

                        chunk = chunk.subarray(8 - this._plBufLength);

                        if (this._plBuf.readUInt32LE(0) !== 1) {

                            this.onProtocolError(new GE.E_INVALID_PACKET());
                            this.reset();
                            return;
                        }

                        this._plBufLength = 0;
                        this._packetLength = this._plBuf.readUInt32LE(4);
                    }
                    else {

                        chunk.copy(this._plBuf, this._plBufLength);

                        this._plBufLength += chunk.byteLength;
                        return;
                    }
                }
                else {

                    if (chunk.length >= 8) {

                        if (chunk.readUInt32LE(0) !== 1) {

                            this.onProtocolError(new GE.E_INVALID_PACKET());
                            this.reset();
                            return;
                        }

                        this._packetLength = chunk.readUInt32LE(4);
                        chunk = chunk.subarray(8);
                        this._plBufLength = 0;
                    }
                    else {

                        chunk.copy(this._plBuf, this._plBufLength);

                        this._plBufLength = chunk.byteLength;
                        return;
                    }
                }

                if (this._packetLength > C.MAX_PACKET_SIZE) { // Maximum packet size is 64M

                    this.onProtocolError(new GE.E_PACKET_TOO_LARGE());
                    this.reset();
                }

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
