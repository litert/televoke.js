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

import * as CSv2 from './Constants.v2';
import * as CS from '../../Constants';
import { ProtocolError, TelevokeError, errors } from '../../Errors';
import type * as dEnc2 from './Encoding.v2.decl';

interface IDecodeContext {

    chunks: Buffer[];

    chIndex: number;

    chOffset: number;

    command: CSv2.ECommand;

    type: CSv2.EPacketType;

    seq: number;
}

const B8 = Buffer.allocUnsafe(8);
const B4 = Buffer.allocUnsafe(4);
const B_API_CALL_REQ_EXT_HEADER = Buffer.allocUnsafe(CSv2.API_CALL_REQ_EXT_HEADER_SIZE);
const B_API_CALL_RESP_EXT_HEADER = Buffer.allocUnsafe(CSv2.API_CALL_RESP_EXT_HEADER_SIZE);
const B2 = Buffer.allocUnsafe(2);

interface IPacketDecoder {

    decode(ctx: IDecodeContext): dEnc2.ICommandPacket;
}

function skipBytes(bytes: number, ctx: IDecodeContext): void {

    let readBytes = 0;

    while (readBytes < bytes) {

        if (ctx.chIndex === ctx.chunks.length) {

            throw new errors.incomplete_packet();
        }

        const c = ctx.chunks[ctx.chIndex];
        const cLen = c.byteLength;
        let cOff = ctx.chOffset;

        do {

            readBytes++;
            cOff++;
        }
        while (cOff < cLen && readBytes < bytes);

        if (cOff === cLen) {

            ctx.chIndex++;
            ctx.chOffset = 0;
        }
        else {

            ctx.chOffset = cOff;
        }

        if (readBytes === bytes) {

            break;
        }
    }
}

function readSmallBytes(bytes: number, buf: Buffer, ctx: IDecodeContext): Buffer {

    let readBytes = 0;

    while (readBytes < bytes) {

        if (ctx.chIndex === ctx.chunks.length) {

            throw new errors.incomplete_packet();
        }

        const c = ctx.chunks[ctx.chIndex];
        const cLen = c.byteLength;
        let cOff = ctx.chOffset;

        do {

            buf[readBytes++] = c[cOff++];
        }
        while (cOff < cLen && readBytes < bytes);

        if (cOff === cLen) {

            ctx.chIndex++;
            ctx.chOffset = 0;
        }
        else {

            ctx.chOffset = cOff;
        }

        if (readBytes === bytes) {

            break;
        }
    }

    return buf;
}

function readLargeBytes(bytes: number, ctx: IDecodeContext): Buffer[] {

    let readBytes = 0;
    const ret: Buffer[] = [];

    while (readBytes < bytes) {

        if (ctx.chIndex === ctx.chunks.length) {

            throw new errors.incomplete_packet();
        }

        const c = ctx.chunks[ctx.chIndex];
        const bytes2Read = Math.min(bytes - readBytes, c.byteLength - ctx.chOffset);

        ret.push(c.subarray(ctx.chOffset, ctx.chOffset + bytes2Read));

        readBytes += bytes2Read;
        ctx.chOffset += bytes2Read;

        if (ctx.chOffset === c.byteLength) {

            ctx.chIndex++;
            ctx.chOffset = 0;
        }

        if (readBytes === bytes) {

            break;
        }
    }

    return ret;
}

function readString(bytes: number, ctx: IDecodeContext): string {

    const td = new TextDecoder('utf8');

    let readBytes = 0;
    let ret: string = '';

    while (readBytes < bytes) {

        if (ctx.chIndex === ctx.chunks.length) {

            throw new errors.incomplete_packet();
        }

        const c = ctx.chunks[ctx.chIndex];
        const bytes2Read = Math.min(bytes - readBytes, c.byteLength - ctx.chOffset);

        ret += td.decode(c.subarray(ctx.chOffset, ctx.chOffset + bytes2Read), { stream: true });

        readBytes += bytes2Read;
        ctx.chOffset += bytes2Read;

        if (ctx.chOffset === c.byteLength) {

            ctx.chIndex++;
            ctx.chOffset = 0;
        }

        if (readBytes === bytes) {

            break;
        }
    }

    return ret;
}

function readVarString(ctx: IDecodeContext): string {

    const len = readSmallBytes(2, B2, ctx).readUInt16LE(0);

    return readString(len, ctx);
}

function readVarBuffer(ctx: IDecodeContext): Buffer[] {

    const len = readSmallBytes(4, B4, ctx).readUInt32LE(0);

    return readLargeBytes(len, ctx);
}

function readVarBuffer16(ctx: IDecodeContext): Buffer[] {

    const len = readSmallBytes(2, B4, ctx).readUInt16LE(0);

    return readLargeBytes(len, ctx);
}

class TvErrorResponseDecoder implements IPacketDecoder {

    public decode(ctx: IDecodeContext): dEnc2.ICommandPacket {

        const len = readSmallBytes(2, B2, ctx).readUInt16LE(0);

        const errorMsg = readString(len, ctx);

        let err: TelevokeError;

        if (errorMsg.startsWith(CS.PROTOCOL_ERROR_NAMESPACE)) {

            const errMsg = errorMsg.slice(CS.PROTOCOL_ERROR_NAMESPACE.length + 1);

            if (errMsg in errors) {

                err = new (errors as any)[errMsg]();
            }
            else {

                err = new ProtocolError(errMsg, null, null);
            }
        }
        else {

            err = new errors.app_error(errorMsg.slice(CS.APP_ERROR_NAMESPACE.length + 1), null);
        }

        return {
            'cmd': ctx.command,
            'typ': CSv2.EPacketType.ERROR_RESPONSE,
            'seq': ctx.seq,
            'ct': err,
        } satisfies dEnc2.IErrorReplyPacket;
    }
}

class TvApiRequestDecoder implements IPacketDecoder {

    private _decodeExtPart(
        ctx: IDecodeContext,
        ctOut: dEnc2.IApiRequestPacketDecoded['ct']
    ): dEnc2.IApiRequestPacketDecoded['ct'] {

        if (ctx.chIndex >= ctx.chunks.length) {

            ctOut.bodyEnc = CSv2.DEFAULT_API_ARGS_ENCODING;
            return ctOut;
        }

        const hdrBuf = readSmallBytes(B_API_CALL_REQ_EXT_HEADER.byteLength, B_API_CALL_REQ_EXT_HEADER, ctx);
        const hdrLen = hdrBuf.readUInt32LE(CSv2.EApiCallReqExtHeaderFieldOffset.LENGTH);
        const bodyEnc = hdrBuf.readUInt32LE(CSv2.EApiCallReqExtHeaderFieldOffset.BODY_ENC);
        const chkQty = hdrBuf.readUInt32LE(CSv2.EApiCallReqExtHeaderFieldOffset.BIN_CHUNK_QTY);

        if (!chkQty) {

            ctOut.bodyEnc = bodyEnc;
            return ctOut;
        }

        if (hdrLen > B_API_CALL_REQ_EXT_HEADER.length) {

            skipBytes(hdrLen - B_API_CALL_REQ_EXT_HEADER.length, ctx);
        }

        const binChunks: Buffer[][] = [];

        for (let i = 0; i < chkQty; ++i) {

            binChunks.push(readVarBuffer(ctx));
        }

        ctOut.bodyEnc = bodyEnc;
        ctOut.binChunks = binChunks;

        return ctOut;
    }

    public decode(ctx: IDecodeContext): dEnc2.ICommandPacket {

        const name = readVarString(ctx);

        const body = readVarBuffer(ctx);

        return {
            'cmd': CSv2.ECommand.API_CALL,
            'typ': CSv2.EPacketType.REQUEST,
            'seq': ctx.seq,
            'ct': this._decodeExtPart(ctx, {
                'name': name,
                'body': body,
            })
        } satisfies dEnc2.IApiRequestPacketDecoded;
    }
}

class TvPingRequestDecoder implements IPacketDecoder {

    public decode(ctx: IDecodeContext): dEnc2.ICommandPacket {

        return {
            'cmd': CSv2.ECommand.PING,
            'typ': CSv2.EPacketType.REQUEST,
            'seq': ctx.seq,
            'ct': readVarBuffer16(ctx)
        } satisfies dEnc2.IPingRequestPacketDecoded;
    }
}

class TvPushMessageRequestDecoder implements IPacketDecoder {

    public decode(ctx: IDecodeContext): dEnc2.ICommandPacket {

        return {
            'cmd': CSv2.ECommand.PUSH_MESSAGE,
            'typ': CSv2.EPacketType.REQUEST,
            'seq': ctx.seq,
            'ct': readVarBuffer(ctx)
        } satisfies dEnc2.IPushMessageRequestPacketDecoded;
    }
}

class TvBinaryChunkRequestDecoder implements IPacketDecoder {

    public decode(ctx: IDecodeContext): dEnc2.ICommandPacket {

        const streamId = readSmallBytes(4, B4, ctx).readUInt32LE(0);
        const chunkIndex = readSmallBytes(4, B4, ctx).readUInt32LE(0);
        return {
            'cmd': CSv2.ECommand.BINARY_CHUNK,
            'typ': CSv2.EPacketType.REQUEST,
            'seq': ctx.seq,
            'ct': {
                'streamId': streamId,
                'index': chunkIndex,
                'body': readVarBuffer(ctx),
            }
        } satisfies dEnc2.IBinaryChunkRequestPacketDecoded;
    }
}

class TvCloseRequestDecoder implements IPacketDecoder {

    public decode(ctx: IDecodeContext): dEnc2.ICommandPacket {

        return {
            'cmd': CSv2.ECommand.CLOSE,
            'typ': CSv2.EPacketType.REQUEST,
            'seq': ctx.seq,
            'ct': null
        } satisfies dEnc2.ICloseRequestPacket;
    }
}

class TvVoidResponseDecoder implements IPacketDecoder {

    public decode(ctx: IDecodeContext): dEnc2.ICommandPacket {

        return {
            'cmd': ctx.command,
            'typ': CSv2.EPacketType.SUCCESS_RESPONSE,
            'seq': ctx.seq,
            'ct': null
        } satisfies dEnc2.IOkReplyPacket;
    }
}

class TvApiReplyDecoder implements IPacketDecoder {

    private _decodeExtPart(
        ctx: IDecodeContext,
        ctOut: dEnc2.IApiReplyPacketDecoded['ct'],

    ): dEnc2.IApiReplyPacketDecoded['ct'] {

        if (ctx.chIndex >= ctx.chunks.length) {

            return ctOut;
        }

        const MIN_EXT_HEADER_LEN = CSv2.API_CALL_RESP_EXT_HEADER_SIZE;
        const extHdr = readSmallBytes(MIN_EXT_HEADER_LEN, B_API_CALL_RESP_EXT_HEADER, ctx);
        const extHdrLen = extHdr.readUInt32LE(CSv2.EApiCallRespExtHeaderFieldOffset.LENGTH);
        const extBinChunkQty = extHdr.readUInt32LE(CSv2.EApiCallRespExtHeaderFieldOffset.BIN_CHUNK_QTY);

        if (!extBinChunkQty) {

            return ctOut;
        }

        if (extHdrLen > MIN_EXT_HEADER_LEN) {

            skipBytes(extHdrLen - MIN_EXT_HEADER_LEN, ctx);
        }

        const extBinChunks: Buffer[][] = [];

        for (let i = 0; i < extBinChunkQty; ++i) {

            extBinChunks.push(readVarBuffer(ctx));
        }

        ctOut.binChunks = extBinChunks;

        return ctOut;
    }

    public decode(ctx: IDecodeContext): dEnc2.ICommandPacket {

        const body = readVarBuffer(ctx);
        return {
            'cmd': CSv2.ECommand.API_CALL,
            'typ': CSv2.EPacketType.SUCCESS_RESPONSE,
            'seq': ctx.seq,
            'ct': this._decodeExtPart(ctx, { body })
        } satisfies dEnc2.IApiReplyPacketDecoded;
    }
}

class TvPingResponseDecoder implements IPacketDecoder {

    public decode(ctx: IDecodeContext): dEnc2.ICommandPacket {

        return {
            'cmd': CSv2.ECommand.PING,
            'typ': CSv2.EPacketType.SUCCESS_RESPONSE,
            'seq': ctx.seq,
            'ct': readVarBuffer16(ctx)
        } satisfies dEnc2.IPingReplyPacketDecoded;
    }
}

const packetDecoders: Record<number, IPacketDecoder> = {

    [CSv2.EPacketType.ERROR_RESPONSE + 0x100 * CSv2.ECommand.API_CALL]: new TvErrorResponseDecoder(),
    [CSv2.EPacketType.ERROR_RESPONSE + 0x100 * CSv2.ECommand.PING]: new TvErrorResponseDecoder(),
    [CSv2.EPacketType.ERROR_RESPONSE + 0x100 * CSv2.ECommand.BINARY_CHUNK]: new TvErrorResponseDecoder(),
    [CSv2.EPacketType.ERROR_RESPONSE + 0x100 * CSv2.ECommand.CLOSE]: new TvErrorResponseDecoder(),
    [CSv2.EPacketType.ERROR_RESPONSE + 0x100 * CSv2.ECommand.PUSH_MESSAGE]: new TvErrorResponseDecoder(),

    [CSv2.EPacketType.REQUEST + 0x100 * CSv2.ECommand.API_CALL]: new TvApiRequestDecoder(),
    [CSv2.EPacketType.REQUEST + 0x100 * CSv2.ECommand.PING]: new TvPingRequestDecoder(),
    [CSv2.EPacketType.REQUEST + 0x100 * CSv2.ECommand.PUSH_MESSAGE]: new TvPushMessageRequestDecoder(),
    [CSv2.EPacketType.REQUEST + 0x100 * CSv2.ECommand.CLOSE]: new TvCloseRequestDecoder(),
    [CSv2.EPacketType.REQUEST + 0x100 * CSv2.ECommand.BINARY_CHUNK]: new TvBinaryChunkRequestDecoder(),

    [CSv2.EPacketType.SUCCESS_RESPONSE + 0x100 * CSv2.ECommand.PUSH_MESSAGE]: new TvVoidResponseDecoder(),
    [CSv2.EPacketType.SUCCESS_RESPONSE + 0x100 * CSv2.ECommand.CLOSE]: new TvVoidResponseDecoder(),
    [CSv2.EPacketType.SUCCESS_RESPONSE + 0x100 * CSv2.ECommand.BINARY_CHUNK]: new TvVoidResponseDecoder(),
    [CSv2.EPacketType.SUCCESS_RESPONSE + 0x100 * CSv2.ECommand.API_CALL]: new TvApiReplyDecoder(),
    [CSv2.EPacketType.SUCCESS_RESPONSE + 0x100 * CSv2.ECommand.PING]: new TvPingResponseDecoder(),
};

export class TvDecoderV2 {

    /**
     * Pass all chunks of a whole packet to this method, and it will return an array of decoded results.
     *
     * @throws {TelevokeError}
     */
    public decode(packetChunks: Buffer[]): dEnc2.ICommandPacket {

        const ctx = this._decodeHeader(packetChunks);

        try {

            return packetDecoders[ctx.command * 0x100 + ctx.type].decode(ctx);
        }
        catch (e) {

            if (e instanceof TelevokeError) {

                throw e;
            }

            throw new errors.invalid_packet(null, e);
        }
    }

    private _decodeHeader(chunks: Buffer[]): IDecodeContext {

        try {

            const ctx: IDecodeContext = {
                chunks,
                chIndex: 0,
                chOffset: 0,
                command: 0,
                type: 0,
                seq: 0,
            };

            readSmallBytes(8, B8, ctx);

            ctx.command = B8[0];
            ctx.type = B8[1];

            if (undefined === CSv2.EPacketType[ctx.type]) {

                throw new errors.invalid_packet({
                    unknownPacketType: ctx.type,
                });
            }

            if (undefined === CSv2.ECommand[ctx.command]) {

                throw new errors.invalid_packet({
                    unknownCommand: ctx.command,
                });
            }

            ctx.seq = B8.readUInt16LE(2)  * 0x1_0000_0000 + B8.readUInt32LE(4);

            return ctx;
        }
        catch (e) {

            if (e instanceof TelevokeError) {

                throw e;
            }

            throw new errors.invalid_packet(null, e);
        }
    }
}
