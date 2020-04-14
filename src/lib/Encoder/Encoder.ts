import * as C from '../Common';

class Encoder implements C.IEncoder {

    private _buf: Buffer;

    private _bufOffset: number[];

    private _cur: number = 0;

    public constructor(bufSize: number = 1024 * 8) {

        this._bufOffset = Array(bufSize / 4).fill(0).map((v, i) => i * 4);
        this._buf = Buffer.allocUnsafe(bufSize);
    }

    public encode(socket: C.IWritable, content: any): void {

        content = JSON.stringify(content);

        let offset = this._bufOffset[this._cur++];

        if (undefined === offset) {

            this._buf = Buffer.allocUnsafe(this._buf.byteLength * 2);

            offset = this._bufOffset[this._cur - 2] + 4;

            this._bufOffset = [
                ...this._bufOffset,
                ...Array(this._bufOffset.length).fill(0).map((v, i) => offset + i * 4)
            ];
        }

        let buf: Buffer = this._buf.slice(offset, offset + 4);

        buf.writeUInt32LE(Buffer.byteLength(content), 0);
        socket.write(buf, () => {

            this._bufOffset[--this._cur] = offset;
        });

        socket.write(content);
    }
}

export function createEncoder(): C.IEncoder {

    return new Encoder();
}
