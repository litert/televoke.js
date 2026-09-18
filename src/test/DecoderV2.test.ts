/* eslint-disable */
/**
 * Copyright 2026 Angus.Fenying <fenying@litert.org>
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

import * as NodeAssert from 'node:assert';
import * as NodeTest from 'node:test';
import * as Tv from '../lib/shared';

const decoder = new Tv.Encodings.v2.TvDecoderV2();

function splitPacket(packet: Buffer): Buffer[] {

    const chunks: Buffer[] = [];

    for (let offset = 0; offset < packet.length; ++offset) {

        chunks.push(packet.subarray(offset, offset + 1));
    }

    return chunks;
}

function createHeader(
    command: Tv.Encodings.v2.ECommand,
    type: Tv.Encodings.v2.EPacketType,
    sequence: number,
): Buffer {

    const header = Buffer.alloc(Tv.Encodings.v2.HEADER_SIZE);
    header[0] = command;
    header[1] = type;
    header.writeUInt16LE(Math.floor(sequence / 0x1_0000_0000), 2);
    header.writeUInt32LE(sequence % 0x1_0000_0000, 4);

    return header;
}

function createVarBuffer(content: Buffer): Buffer {

    const length = Buffer.alloc(4);
    length.writeUInt32LE(content.length, 0);

    return Buffer.concat([length, content]);
}

function assertBinaryChunks(
    actual: Buffer[][] | undefined,
    expected: Buffer[],
): void {

    NodeAssert.ok(actual);
    NodeAssert.deepStrictEqual(actual.map((parts) => Buffer.concat(parts)), expected);
}

NodeTest.describe('Televoke v2 decoder', () => {

    NodeTest.it('B-M-00001: [BUG] decodes fragmented API_CALL request extended chunks', () => {

        const packet = Buffer.from(
            '00000000010000000100610200000010110c0000000700000003000000'
            + '02000000aabb03000000ccddee00000000',
            'hex',
        );
        const result = decoder.decode(splitPacket(packet)) as
            Tv.Encodings.v2.IApiRequestPacketDecoded;

        NodeAssert.strictEqual(result.cmd, Tv.Encodings.v2.ECommand.API_CALL);
        NodeAssert.strictEqual(result.typ, Tv.Encodings.v2.EPacketType.REQUEST);
        NodeAssert.strictEqual(result.seq, 1);
        NodeAssert.strictEqual(result.ct.name, 'a');
        NodeAssert.deepStrictEqual(Buffer.concat(result.ct.body), Buffer.from([0x10, 0x11]));
        NodeAssert.strictEqual(result.ct.bodyEnc, 7);
        assertBinaryChunks(result.ct.binChunks, [
            Buffer.from([0xaa, 0xbb]),
            Buffer.from([0xcc, 0xdd, 0xee]),
            Buffer.alloc(0),
        ]);
    });

    NodeTest.it('B-M-00002: [BUG] decodes fragmented API_CALL response extended chunks', () => {

        const packet = Buffer.from(
            '0001000001000000020000001011080000000300000002000000aabb'
            + '03000000ccddee00000000',
            'hex',
        );
        const result = decoder.decode(splitPacket(packet)) as
            Tv.Encodings.v2.IApiReplyPacketDecoded;

        NodeAssert.strictEqual(result.cmd, Tv.Encodings.v2.ECommand.API_CALL);
        NodeAssert.strictEqual(result.typ, Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE);
        NodeAssert.strictEqual(result.seq, 1);
        NodeAssert.deepStrictEqual(Buffer.concat(result.ct.body), Buffer.from([0x10, 0x11]));
        assertBinaryChunks(result.ct.binChunks, [
            Buffer.from([0xaa, 0xbb]),
            Buffer.from([0xcc, 0xdd, 0xee]),
            Buffer.alloc(0),
        ]);
    });

    NodeTest.it('B-M-00003: decodes Televoke 2.0 API_CALL packets without extensions', () => {

        const request = Buffer.concat([
            createHeader(
                Tv.Encodings.v2.ECommand.API_CALL,
                Tv.Encodings.v2.EPacketType.REQUEST,
                2,
            ),
            Buffer.from([1, 0]),
            Buffer.from('a'),
            createVarBuffer(Buffer.from([0x10])),
        ]);
        const response = Buffer.concat([
            createHeader(
                Tv.Encodings.v2.ECommand.API_CALL,
                Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                3,
            ),
            createVarBuffer(Buffer.from([0x11])),
        ]);
        const decodedRequest = decoder.decode([request]) as
            Tv.Encodings.v2.IApiRequestPacketDecoded;
        const decodedResponse = decoder.decode([response]) as
            Tv.Encodings.v2.IApiReplyPacketDecoded;

        NodeAssert.strictEqual(decodedRequest.ct.bodyEnc, 0);
        NodeAssert.strictEqual(decodedRequest.ct.binChunks, undefined);
        NodeAssert.deepStrictEqual(Buffer.concat(decodedRequest.ct.body), Buffer.from([0x10]));
        NodeAssert.strictEqual(decodedResponse.ct.binChunks, undefined);
        NodeAssert.deepStrictEqual(Buffer.concat(decodedResponse.ct.body), Buffer.from([0x11]));
    });

    NodeTest.it('B-M-00004: decodes PING, PUSH_MESSAGE, BINARY_CHUNK, and CLOSE requests', () => {

        const ping = decoder.decode([Buffer.concat([
            createHeader(Tv.Encodings.v2.ECommand.PING, Tv.Encodings.v2.EPacketType.REQUEST, 4),
            Buffer.from([1, 0, 0xaa]),
        ])]) as Tv.Encodings.v2.IPingRequestPacketDecoded;
        const push = decoder.decode([Buffer.concat([
            createHeader(Tv.Encodings.v2.ECommand.PUSH_MESSAGE, Tv.Encodings.v2.EPacketType.REQUEST, 5),
            createVarBuffer(Buffer.from([0xbb])),
        ])]) as Tv.Encodings.v2.IPushMessageRequestPacketDecoded;
        const binary = decoder.decode([Buffer.concat([
            createHeader(Tv.Encodings.v2.ECommand.BINARY_CHUNK, Tv.Encodings.v2.EPacketType.REQUEST, 6),
            Buffer.from([7, 0, 0, 0, 8, 0, 0, 0]),
            createVarBuffer(Buffer.from([0xcc])),
        ])]) as Tv.Encodings.v2.IBinaryChunkRequestPacketDecoded;
        const close = decoder.decode([createHeader(
            Tv.Encodings.v2.ECommand.CLOSE,
            Tv.Encodings.v2.EPacketType.REQUEST,
            7,
        )]) as Tv.Encodings.v2.ICloseRequestPacket;

        NodeAssert.deepStrictEqual(Buffer.concat(ping.ct), Buffer.from([0xaa]));
        NodeAssert.deepStrictEqual(Buffer.concat(push.ct), Buffer.from([0xbb]));
        NodeAssert.strictEqual(binary.ct.streamId, 7);
        NodeAssert.strictEqual(binary.ct.index, 8);
        NodeAssert.deepStrictEqual(Buffer.concat(binary.ct.body), Buffer.from([0xcc]));
        NodeAssert.strictEqual(close.ct, null);
    });
});
