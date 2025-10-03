/**
 * Copyright 2025 Angus.Fenying <fenying@litert.org>
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

import { v2 } from '..';
import * as CS from './Constants.v2';
import type * as dEnc2 from './Encoding.v2.decl';

function writePacketHeader(ret: Buffer, command: CS.ECommand, type: CS.EPacketType, seq: number): void {

    ret.writeUInt8(command, 0);
    ret.writeUInt8(type, 1);
    const low = seq % 0x1_0000_0000;
    const high = (seq - low) / 0x1_0000_0000;
    ret.writeUInt16LE(high, 2);
    ret.writeUInt32LE(low, 4);
}

interface IPacketEncoder {

    /**
     * Encode the given packet.
     *
     * @param packet    The packet to encode.
     */
    encode(packet: dEnc2.ICommandPacket): Array<string | Buffer>;
}

class ErrorReplyEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IErrorReplyPacket): v2.IBinLikeArray {

        const errorMsg = `${packet.ct.name}:${packet.ct.message}`;

        const msgLen = Buffer.byteLength(errorMsg);

        const buf = Buffer.allocUnsafe(CS.HEADER_SIZE + 2 + msgLen);

        writePacketHeader(buf, packet.cmd, packet.typ, packet.seq);

        buf.writeUInt16LE(msgLen, CS.HEADER_SIZE);
        buf.write(errorMsg, CS.HEADER_SIZE + 2);

        return [buf];
    }
}

class VoidReplyEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IOkReplyPacket): v2.IBinLikeArray {

        const buf = Buffer.allocUnsafe(CS.HEADER_SIZE);

        writePacketHeader(buf, packet.cmd, packet.typ, packet.seq);

        return [buf];
    }
}

class ApiRequestEncoder implements IPacketEncoder {

    private _createExtPart(
        out: dEnc2.IBinLikeArray,
        argsBodyEncoding: number = CS.DEFAULT_API_ARGS_ENCODING,
        binChunks?: dEnc2.IEncBinItem[],
    ): dEnc2.IBinLikeArray {

        const header = Buffer.allocUnsafe(CS.API_CALL_REQ_EXT_HEADER_SIZE);

        out.push(header);

        header.writeUInt32LE(CS.API_CALL_REQ_EXT_HEADER_SIZE, CS.EApiCallReqExtHeaderFieldOffset.LENGTH);
        header.writeUInt32LE(argsBodyEncoding, CS.EApiCallReqExtHeaderFieldOffset.BODY_ENC);
        header.writeUInt32LE(binChunks?.length ?? 0, CS.EApiCallReqExtHeaderFieldOffset.BIN_CHUNK_QTY);

        if (!binChunks?.length) {

            return out;
        }

        for (const chunk of binChunks) {

            let chunkLen = 0;

            if (!chunk.length) {

                const lenBuf = Buffer.allocUnsafe(4);
                lenBuf.writeUInt32LE(chunkLen, 0);
                out.push(lenBuf);
                continue;
            }

            const lenBuf = Buffer.allocUnsafe(4);

            if (Array.isArray(chunk)) {

                for (const p of chunk) {
    
                    chunkLen += p instanceof Buffer ? p.length : Buffer.byteLength(p);
                }

                lenBuf.writeUInt32LE(chunkLen, 0);
                out.push(lenBuf);
                out.push(...chunk);
            }
            else {

                lenBuf.writeUInt32LE(Buffer.byteLength(chunk), 0);
                out.push(lenBuf, chunk);
            }
        }

        return out;
    }

    public encode(packet: dEnc2.IApiRequestPacketEncoding): v2.IBinLikeArray {

        const apiNameLen = Buffer.byteLength(packet.ct.name);

        const leadSeg = Buffer.allocUnsafe(CS.HEADER_SIZE + 2 + 4 + apiNameLen);

        writePacketHeader(leadSeg, packet.cmd, packet.typ, packet.seq);

        leadSeg.writeUInt16LE(apiNameLen, CS.HEADER_SIZE);
        leadSeg.write(packet.ct.name, CS.HEADER_SIZE + 2);

        if (Array.isArray(packet.ct.body)) {

            let bodyLen = 0;

            for (const p of packet.ct.body) {

                bodyLen += Buffer.byteLength(p);
            }

            leadSeg.writeUInt32LE(bodyLen, CS.HEADER_SIZE + 2 + apiNameLen);

            return this._createExtPart([
                leadSeg,
                ...packet.ct.body
            ], packet.ct.bodyEnc, packet.ct.binChunks);
        }

        leadSeg.writeUInt32LE(Buffer.byteLength(packet.ct.body), CS.HEADER_SIZE + 2 + apiNameLen);

        return this._createExtPart([
            leadSeg,
            packet.ct.body
        ], packet.ct.bodyEnc, packet.ct.binChunks);
    }
}

class BinaryChunkRequestEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IBinaryChunkRequestPacketEncoding): v2.IBinLikeArray {

        const leadSeg = Buffer.allocUnsafe(CS.HEADER_SIZE + 12);

        writePacketHeader(leadSeg, packet.cmd, packet.typ, packet.seq);
        leadSeg.writeUInt32LE(packet.ct.streamId, CS.HEADER_SIZE);
        leadSeg.writeUInt32LE(packet.ct.index, CS.HEADER_SIZE + 4);

        if (Array.isArray(packet.ct.body)) {

            let bodyLen = 0;

            for (const p of packet.ct.body) {

                bodyLen += Buffer.byteLength(p);
            }

            leadSeg.writeUInt32LE(bodyLen, CS.HEADER_SIZE + 8);

            return [leadSeg, ...packet.ct.body];
        }

        leadSeg.writeUInt32LE(Buffer.byteLength(packet.ct.body), CS.HEADER_SIZE + 8);

        return [leadSeg, packet.ct.body];
    }
}

class PingRequestEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IPingRequestPacketEncoding): v2.IBinLikeArray {

        const leadSeg = Buffer.allocUnsafe(CS.HEADER_SIZE + 2);

        writePacketHeader(leadSeg, packet.cmd, packet.typ, packet.seq);

        if (Array.isArray(packet.ct)) {

            let bodyLen = 0;

            for (const p of packet.ct) {

                bodyLen += Buffer.byteLength(p);
            }

            leadSeg.writeUInt16LE(bodyLen, CS.HEADER_SIZE);

            return [leadSeg, ...packet.ct];
        }

        leadSeg.writeUInt16LE(Buffer.byteLength(packet.ct), CS.HEADER_SIZE);

        return [leadSeg, packet.ct];
    }
}

class CloseRequestEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.ICloseRequestPacket): v2.IBinLikeArray {

        const leadSeg = Buffer.allocUnsafe(CS.HEADER_SIZE);

        writePacketHeader(leadSeg, packet.cmd, packet.typ, packet.seq);

        return [leadSeg];
    }
}

class PushMessageRequestEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IPushMessageRequestPacketEncoding): v2.IBinLikeArray {

        const leadSeg = Buffer.allocUnsafe(CS.HEADER_SIZE + 4);

        writePacketHeader(leadSeg, packet.cmd, packet.typ, packet.seq);

        if (Array.isArray(packet.ct)) {

            let bodyLen = 0;

            for (const p of packet.ct) {

                bodyLen += Buffer.byteLength(p);
            }

            leadSeg.writeUInt32LE(bodyLen, CS.HEADER_SIZE);

            return [leadSeg, ...packet.ct];
        }

        leadSeg.writeUInt32LE(Buffer.byteLength(packet.ct), CS.HEADER_SIZE);

        return [leadSeg, packet.ct];
    }
}

class ApiReplyEncoder implements IPacketEncoder {

    private _createExtPart(
        out: dEnc2.IBinLikeArray,
        binChunks?: dEnc2.IEncBinItem[],
    ): dEnc2.IBinLikeArray {

        const header = Buffer.allocUnsafe(CS.API_CALL_RESP_EXT_HEADER_SIZE);
        out.push(header);

        header.writeUInt32LE(CS.API_CALL_RESP_EXT_HEADER_SIZE, CS.EApiCallRespExtHeaderFieldOffset.LENGTH);
        header.writeUInt32LE(binChunks?.length ?? 0, CS.EApiCallRespExtHeaderFieldOffset.BIN_CHUNK_QTY);

        if (!binChunks?.length) {

            return out;
        }

        for (const chunk of binChunks) {

            let chunkLen = 0;

            if (!chunk.length) {

                const lenBuf = Buffer.allocUnsafe(4);
                lenBuf.writeUInt32LE(chunkLen, 0);
                out.push(lenBuf);
                continue;
            }

            const lenBuf = Buffer.allocUnsafe(4);

            if (Array.isArray(chunk)) {

                for (const p of chunk) {
    
                    chunkLen += p instanceof Buffer ? p.length : Buffer.byteLength(p);
                }

                lenBuf.writeUInt32LE(chunkLen, 0);
                out.push(lenBuf);
                out.push(...chunk);
            }
            else {

                lenBuf.writeUInt32LE(Buffer.byteLength(chunk), 0);
                out.push(lenBuf, chunk);
            }
        }

        return out;
    }

    public encode(packet: dEnc2.IApiReplyPacketEncoding): v2.IBinLikeArray {

        const leadSeg = Buffer.allocUnsafe(CS.HEADER_SIZE + 4);

        writePacketHeader(leadSeg, packet.cmd, packet.typ, packet.seq);

        let bodyLen = 0;

        if (Array.isArray(packet.ct.body)) {

            for (const p of packet.ct.body) {

                bodyLen += p instanceof Buffer ? p.byteLength : Buffer.byteLength(p);
            }
        }
        else {

            bodyLen = packet.ct.body instanceof Buffer ? packet.ct.body.byteLength : Buffer.byteLength(packet.ct.body);
        }

        leadSeg.writeUInt32LE(bodyLen, CS.HEADER_SIZE);

        const ret: v2.IBinLikeArray = [leadSeg];

        if (Array.isArray(packet.ct.body)) {

            ret.push(...packet.ct.body);
        }
        else {
    
            ret.push(packet.ct.body);
        }
    
        return this._createExtPart(ret, packet.ct.binChunks);
    }
}

class PingReplyEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IPingReplyPacketEncoding): v2.IBinLikeArray {

        const leadSeg = Buffer.allocUnsafe(CS.HEADER_SIZE + 2);

        writePacketHeader(leadSeg, packet.cmd, packet.typ, packet.seq);

        if (Array.isArray(packet.ct)) {

            let bodyLen = 0;

            for (const p of packet.ct) {

                bodyLen += Buffer.byteLength(p);
            }

            leadSeg.writeUInt16LE(bodyLen, CS.HEADER_SIZE);

            return [leadSeg, ...packet.ct];
        }

        leadSeg.writeUInt16LE(Buffer.byteLength(packet.ct), CS.HEADER_SIZE);

        return [leadSeg, packet.ct];
    }
}

const encoders: Record<number, IPacketEncoder> = {

    [CS.EPacketType.REQUEST * 0x100 + CS.ECommand.API_CALL]: new ApiRequestEncoder(),
    [CS.EPacketType.REQUEST * 0x100 + CS.ECommand.BINARY_CHUNK]: new BinaryChunkRequestEncoder(),
    [CS.EPacketType.REQUEST * 0x100 + CS.ECommand.CLOSE]: new CloseRequestEncoder(),
    [CS.EPacketType.REQUEST * 0x100 + CS.ECommand.PING]: new PingRequestEncoder(),
    [CS.EPacketType.REQUEST * 0x100 + CS.ECommand.PUSH_MESSAGE]: new PushMessageRequestEncoder(),

    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.API_CALL]: new ApiReplyEncoder(),
    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.BINARY_CHUNK]: new VoidReplyEncoder(),
    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.CLOSE]: new VoidReplyEncoder(),
    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.PING]: new PingReplyEncoder(),
    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.PUSH_MESSAGE]: new VoidReplyEncoder(),

    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.API_CALL]: new ErrorReplyEncoder(),
    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.BINARY_CHUNK]: new ErrorReplyEncoder(),
    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.CLOSE]: new ErrorReplyEncoder(),
    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.PING]: new ErrorReplyEncoder(),
    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.PUSH_MESSAGE]: new ErrorReplyEncoder(),
};

export class TvEncoderV2 {

    public encode(packet: dEnc2.ICommandPacket): v2.IBinLikeArray {

        return encoders[packet.typ * 0x100 + packet.cmd].encode(packet);
    }
}
