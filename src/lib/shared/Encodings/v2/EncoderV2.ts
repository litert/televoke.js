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
class ErrorResponseEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IErrorResponsePacket): v2.IDataChunkArray {

        const errorMsg = `${packet.ct.name}:${packet.ct.message}`;

        const msgLen = Buffer.byteLength(errorMsg);

        const buf = Buffer.allocUnsafe(CS.HEADER_SIZE + 2 + msgLen);

        writePacketHeader(buf, packet.cmd, packet.typ, packet.seq);

        buf.writeUInt16LE(msgLen, CS.HEADER_SIZE);
        buf.write(errorMsg, CS.HEADER_SIZE + 2);

        return [buf];
    }
}

class VoidResponseEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.ISuccessResponsePacket): v2.IDataChunkArray {

        const buf = Buffer.allocUnsafe(CS.HEADER_SIZE);

        writePacketHeader(buf, packet.cmd, packet.typ, packet.seq);

        return [buf];
    }
}

class ApiRequestEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IApiRequestPacket): v2.IDataChunkArray {

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

            return [leadSeg, ...packet.ct.body];
        }

        leadSeg.writeUInt32LE(Buffer.byteLength(packet.ct.body), CS.HEADER_SIZE + 2 + apiNameLen);

        return [leadSeg, packet.ct.body];
    }
}

class BinaryChunkRequestEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IBinaryChunkRequestPacket): v2.IDataChunkArray {

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

    public encode(packet: dEnc2.IPingRequestPacket): v2.IDataChunkArray {

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

    public encode(packet: dEnc2.ICloseRequestPacket): v2.IDataChunkArray {

        const leadSeg = Buffer.allocUnsafe(CS.HEADER_SIZE);

        writePacketHeader(leadSeg, packet.cmd, packet.typ, packet.seq);

        return [leadSeg];
    }
}

class PushMessageRequestEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IPushMessageRequestPacket): v2.IDataChunkArray {

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

class ApiResponseEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IApiResponsePacket): v2.IDataChunkArray {

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

class PingResponseEncoder implements IPacketEncoder {

    public encode(packet: dEnc2.IPingResponsePacket): v2.IDataChunkArray {

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

    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.API_CALL]: new ApiResponseEncoder(),
    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.BINARY_CHUNK]: new VoidResponseEncoder(),
    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.CLOSE]: new VoidResponseEncoder(),
    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.PING]: new PingResponseEncoder(),
    [CS.EPacketType.SUCCESS_RESPONSE * 0x100 + CS.ECommand.PUSH_MESSAGE]: new VoidResponseEncoder(),

    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.API_CALL]: new ErrorResponseEncoder(),
    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.BINARY_CHUNK]: new ErrorResponseEncoder(),
    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.CLOSE]: new ErrorResponseEncoder(),
    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.PING]: new ErrorResponseEncoder(),
    [CS.EPacketType.ERROR_RESPONSE * 0x100 + CS.ECommand.PUSH_MESSAGE]: new ErrorResponseEncoder(),
};

export class TvEncoderV2 {

    public encode(packet: dEnc2.ICommandPacket): Array<Buffer | string> {

        return encoders[packet.typ * 0x100 + packet.cmd].encode(packet);
    }
}
