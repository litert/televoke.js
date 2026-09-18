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
import { ensureBufferArray } from './utils';

const encoder = new Tv.Encodings.v2.TvEncoderV2();

function encode(packet: Parameters<typeof encoder.encode>[0]): Buffer {

    return Buffer.concat(ensureBufferArray(encoder.encode(packet)));
}

function assertPacketHeader(
    packet: Buffer,
    command: Tv.Encodings.v2.ECommand,
    type: Tv.Encodings.v2.EPacketType,
    sequence: number,
): void {

    NodeAssert.strictEqual(packet[0], command);
    NodeAssert.strictEqual(packet[1], type);
    NodeAssert.strictEqual(
        packet.readUInt16LE(2) * 0x1_0000_0000 + packet.readUInt32LE(4),
        sequence,
    );
}

NodeTest.describe('Televoke v2 encoder', () => {

    NodeTest.it('B-M-00001: [BUG] encodes API_CALL request extended binary chunks', () => {

        const packet = encode({
            'cmd': Tv.Encodings.v2.ECommand.API_CALL,
            'typ': Tv.Encodings.v2.EPacketType.REQUEST,
            'seq': 1,
            'ct': {
                'name': 'a',
                'body': Buffer.from([0x10, 0x11]),
                'bodyEnc': 7,
                'binChunks': [
                    Buffer.from([0xaa, 0xbb]),
                    [Buffer.from([0xcc]), Buffer.from([0xdd, 0xee])],
                    Buffer.alloc(0),
                ],
            },
        } satisfies Tv.Encodings.v2.IApiRequestPacketEncoding);

        NodeAssert.deepStrictEqual(packet, Buffer.from(
            '00000000010000000100610200000010110c0000000700000003000000'
            + '02000000aabb03000000ccddee00000000',
            'hex',
        ));
    });

    NodeTest.it('B-M-00002: [BUG] encodes API_CALL response extended binary chunks', () => {

        const packet = encode({
            'cmd': Tv.Encodings.v2.ECommand.API_CALL,
            'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
            'seq': 1,
            'ct': {
                'body': Buffer.from([0x10, 0x11]),
                'binChunks': [
                    Buffer.from([0xaa, 0xbb]),
                    [Buffer.from([0xcc]), Buffer.from([0xdd, 0xee])],
                    Buffer.alloc(0),
                ],
            },
        } satisfies Tv.Encodings.v2.IApiReplyPacketEncoding);

        NodeAssert.deepStrictEqual(packet, Buffer.from(
            '0001000001000000020000001011080000000300000002000000aabb'
            + '03000000ccddee00000000',
            'hex',
        ));
    });

    NodeTest.it('B-M-00003: encodes non-API command headers and payload lengths', () => {

        const cases = [
            {
                'packet': encode({
                    'cmd': Tv.Encodings.v2.ECommand.BINARY_CHUNK,
                    'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                    'seq': 2,
                    'ct': {
                        'streamId': 3,
                        'index': 4,
                        'body': Buffer.from([0x05]),
                    },
                } satisfies Tv.Encodings.v2.IBinaryChunkRequestPacketEncoding),
                'command': Tv.Encodings.v2.ECommand.BINARY_CHUNK,
                'type': Tv.Encodings.v2.EPacketType.REQUEST,
                'sequence': 2,
                'payloadLength': 13,
            },
            {
                'packet': encode({
                    'cmd': Tv.Encodings.v2.ECommand.PING,
                    'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                    'seq': 3,
                    'ct': Buffer.from([0x06]),
                } satisfies Tv.Encodings.v2.IPingRequestPacketEncoding),
                'command': Tv.Encodings.v2.ECommand.PING,
                'type': Tv.Encodings.v2.EPacketType.REQUEST,
                'sequence': 3,
                'payloadLength': 3,
            },
            {
                'packet': encode({
                    'cmd': Tv.Encodings.v2.ECommand.PING,
                    'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                    'seq': 4,
                    'ct': Buffer.from([0x07]),
                } satisfies Tv.Encodings.v2.IPingReplyPacketEncoding),
                'command': Tv.Encodings.v2.ECommand.PING,
                'type': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                'sequence': 4,
                'payloadLength': 3,
            },
            {
                'packet': encode({
                    'cmd': Tv.Encodings.v2.ECommand.PUSH_MESSAGE,
                    'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                    'seq': 5,
                    'ct': Buffer.from([0x08]),
                } satisfies Tv.Encodings.v2.IPushMessageRequestPacketEncoding),
                'command': Tv.Encodings.v2.ECommand.PUSH_MESSAGE,
                'type': Tv.Encodings.v2.EPacketType.REQUEST,
                'sequence': 5,
                'payloadLength': 5,
            },
            {
                'packet': encode({
                    'cmd': Tv.Encodings.v2.ECommand.CLOSE,
                    'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                    'seq': 6,
                    'ct': null,
                } satisfies Tv.Encodings.v2.ICloseRequestPacket),
                'command': Tv.Encodings.v2.ECommand.CLOSE,
                'type': Tv.Encodings.v2.EPacketType.REQUEST,
                'sequence': 6,
                'payloadLength': 0,
            },
            {
                'packet': encode({
                    'cmd': Tv.Encodings.v2.ECommand.BINARY_CHUNK,
                    'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                    'seq': 7,
                    'ct': null,
                } satisfies Tv.Encodings.v2.IOkReplyPacket),
                'command': Tv.Encodings.v2.ECommand.BINARY_CHUNK,
                'type': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                'sequence': 7,
                'payloadLength': 0,
            },
            {
                'packet': encode({
                    'cmd': Tv.Encodings.v2.ECommand.PUSH_MESSAGE,
                    'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                    'seq': 8,
                    'ct': null,
                } satisfies Tv.Encodings.v2.IOkReplyPacket),
                'command': Tv.Encodings.v2.ECommand.PUSH_MESSAGE,
                'type': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                'sequence': 8,
                'payloadLength': 0,
            },
            {
                'packet': encode({
                    'cmd': Tv.Encodings.v2.ECommand.CLOSE,
                    'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                    'seq': 9,
                    'ct': null,
                } satisfies Tv.Encodings.v2.IOkReplyPacket),
                'command': Tv.Encodings.v2.ECommand.CLOSE,
                'type': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                'sequence': 9,
                'payloadLength': 0,
            },
        ];

        for (const testCase of cases) {

            assertPacketHeader(
                testCase.packet,
                testCase.command,
                testCase.type,
                testCase.sequence,
            );
            NodeAssert.strictEqual(
                testCase.packet.length,
                Tv.Encodings.v2.HEADER_SIZE + testCase.payloadLength,
            );
        }
    });

    NodeTest.it('B-M-00004: encodes application and protocol error responses', () => {

        const sequence = 7;
        const applicationError = encode({
            'cmd': Tv.Encodings.v2.ECommand.API_CALL,
            'typ': Tv.Encodings.v2.EPacketType.ERROR_RESPONSE,
            'seq': sequence,
            'ct': new Tv.errors.app_error('failure'),
        } satisfies Tv.Encodings.v2.IErrorReplyPacket);
        const protocolError = encode({
            'cmd': Tv.Encodings.v2.ECommand.API_CALL,
            'typ': Tv.Encodings.v2.EPacketType.ERROR_RESPONSE,
            'seq': sequence,
            'ct': new Tv.errors.api_not_found(),
        } satisfies Tv.Encodings.v2.IErrorReplyPacket);

        for (const packet of [applicationError, protocolError]) {

            assertPacketHeader(
                packet,
                Tv.Encodings.v2.ECommand.API_CALL,
                Tv.Encodings.v2.EPacketType.ERROR_RESPONSE,
                sequence,
            );
        }

        NodeAssert.strictEqual(
            applicationError.subarray(10).toString(),
            `${Tv.APP_ERROR_NAMESPACE}:failure`,
        );
        NodeAssert.strictEqual(
            protocolError.subarray(10).toString(),
            `${Tv.PROTOCOL_ERROR_NAMESPACE}:api_not_found`,
        );
    });
});
