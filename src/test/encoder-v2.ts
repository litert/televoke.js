/**
* Copyright 2023 Angus.Fenying <fenying@litert.org>
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

import * as Tv from '../lib/shared';
import * as Assert from 'node:assert';
import { DW_LEN, W_LEN, createRandomChunks, createRandomString, ensureBufferArray } from './utils';

const encoder = new Tv.Encodings.v2.TvEncoderV2();

function testHeader(
    packet: Buffer,
    payloadLength: number,
    cmd: Tv.Encodings.v2.ECommand,
    typ: Tv.Encodings.v2.EPacketType,
    seq: number
): void {

    it('Length of encoded packet should be corrected', function() {

        Assert.equal(packet.byteLength, Tv.Encodings.v2.HEADER_SIZE + payloadLength);
    });

    it('The 1st byte should be the corrected command code', function() {

        Assert.equal(packet[0], cmd);
    });

    it('The 2nd byte should be the corrected command type', function() {

        Assert.equal(packet[1], typ);
    });

    it('The bytes[3...8] should be the corrected packet sequence', function() {

        Assert.equal(packet.readUInt16LE(2) * 0x1_0000_0000 + packet.readUInt32LE(4), seq);
    });

}

describe('Encoder/Decoder', () => {

    describe('Encoder v2', () => {

        describe('Encoding API_CALL request', () => {

            const [dataLen, chunks] = createRandomChunks();

            const API_NAME = createRandomString(128);
            const API_NAME_LEN = Buffer.byteLength(API_NAME);
            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.API_CALL,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': {
                    'name': API_NAME,
                    'body': chunks
                }
            })));

            testHeader(
                packet,
                W_LEN + DW_LEN + API_NAME_LEN + dataLen,
                Tv.Encodings.v2.ECommand.API_CALL,
                Tv.Encodings.v2.EPacketType.REQUEST,
                PACKET_SEQ
            );

            it('The bytes[9...10] should be the corrected API name length', function() {

                Assert.equal(packet.readUInt16LE(Tv.Encodings.v2.HEADER_SIZE), API_NAME_LEN);
            });

            it('The bytes[11...N] should be the corrected API name', function() {

                Assert.equal(
                    packet.subarray(
                        Tv.Encodings.v2.HEADER_SIZE + W_LEN,
                        Tv.Encodings.v2.HEADER_SIZE + W_LEN + packet.readUInt16LE(Tv.Encodings.v2.HEADER_SIZE)
                    ).toString(),
                    API_NAME
                );
            });

            it('The bytes[N...N + 3] should be the corrected body length', function() {

                Assert.equal(packet.readUInt32LE(Tv.Encodings.v2.HEADER_SIZE + W_LEN + API_NAME_LEN), dataLen);
            });

            it('The bytes[N + 2...] should be the corrected body', function() {

                Assert.equal(
                    packet.subarray(Tv.Encodings.v2.HEADER_SIZE + W_LEN + API_NAME_LEN + DW_LEN)
                        .compare(Buffer.concat(chunks)),
                    0
                );
            });
        });

        describe('Encoding API_CALL successful response', () => {

            const [dataLen, chunks] = createRandomChunks();

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.API_CALL,
                'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                'seq': PACKET_SEQ,
                'ct': chunks
            })));

            testHeader(
                packet,
                DW_LEN + dataLen,
                Tv.Encodings.v2.ECommand.API_CALL,
                Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                PACKET_SEQ
            );

            it('The bytes[9...12] should be the corrected body length', function() {

                Assert.equal(packet.readUInt32LE(Tv.Encodings.v2.HEADER_SIZE), dataLen);
            });

            it('The bytes[13...] should be the corrected body', function() {

                Assert.equal(
                    packet.subarray(Tv.Encodings.v2.HEADER_SIZE + DW_LEN)
                        .compare(Buffer.concat(chunks)),
                    0
                );
            });
        });

        describe('Encoding BINARY_CHUNK request', () => {

            const [dataLen, chunks] = createRandomChunks();

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);
            const STREAM_ID = Math.ceil(Math.random() * 0xFFFFFFFF);
            const CHUNK_INDEX = Math.floor(Math.random() * 0xFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.BINARY_CHUNK,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': {
                    'streamId': STREAM_ID,
                    'body': chunks,
                    'index': CHUNK_INDEX
                }
            })));

            testHeader(
                packet,
                DW_LEN + DW_LEN + DW_LEN + dataLen,
                Tv.Encodings.v2.ECommand.BINARY_CHUNK,
                Tv.Encodings.v2.EPacketType.REQUEST,
                PACKET_SEQ
            );

            it('The bytes[9...12] should be the corrected stream id', function() {

                Assert.equal(packet.readUInt32LE(Tv.Encodings.v2.HEADER_SIZE), STREAM_ID);
            });

            it('The bytes[13...16] should be the corrected chunk index', function() {

                Assert.equal(packet.readUInt32LE(Tv.Encodings.v2.HEADER_SIZE + DW_LEN), CHUNK_INDEX);
            });

            it('The bytes[17...20] should be the corrected body length', function() {

                Assert.equal(packet.readUInt32LE(Tv.Encodings.v2.HEADER_SIZE + DW_LEN + DW_LEN), dataLen);
            });

            it('The bytes[17...] should be the corrected body', function() {

                Assert.equal(
                    packet.subarray(Tv.Encodings.v2.HEADER_SIZE + DW_LEN + DW_LEN + DW_LEN)
                        .compare(Buffer.concat(chunks)),
                    0
                );
            });
        });

        describe('Encoding BINARY_CHUNK successful response', () => {

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.BINARY_CHUNK,
                'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                'seq': PACKET_SEQ,
                'ct': null
            })));

            testHeader(
                packet,
                0,
                Tv.Encodings.v2.ECommand.BINARY_CHUNK,
                Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                PACKET_SEQ
            );
        });

        describe('Encoding PUSH_MESSAGE request', () => {

            const [dataLen, chunks] = createRandomChunks();
            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.PUSH_MESSAGE,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': chunks
            })));

            testHeader(
                packet,
                W_LEN + dataLen,
                Tv.Encodings.v2.ECommand.PUSH_MESSAGE,
                Tv.Encodings.v2.EPacketType.REQUEST,
                PACKET_SEQ
            );

            it('The bytes[9...10] should be the corrected message data length', function() {

                Assert.equal(packet.readUInt16LE(Tv.Encodings.v2.HEADER_SIZE), dataLen);
            });

            it('The bytes[11...N] should be the corrected message data', function() {

                Assert.equal(
                    packet.subarray(Tv.Encodings.v2.HEADER_SIZE + W_LEN)
                        .compare(Buffer.concat(chunks)),
                    0
                );
            });
        });

        describe('Encoding PUSH_MESSAGE successful response', () => {

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.PUSH_MESSAGE,
                'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                'seq': PACKET_SEQ,
                'ct': null
            })));

            testHeader(
                packet,
                0,
                Tv.Encodings.v2.ECommand.PUSH_MESSAGE,
                Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                PACKET_SEQ
            );
        });

        describe('Encoding PING request', () => {

            const [dataLen, chunks] = createRandomChunks();
            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.PING,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': chunks
            })));

            testHeader(
                packet,
                W_LEN + dataLen,
                Tv.Encodings.v2.ECommand.PING,
                Tv.Encodings.v2.EPacketType.REQUEST,
                PACKET_SEQ
            );

            it('The bytes[9...10] should be the corrected message data length', function() {

                Assert.equal(packet.readUInt16LE(Tv.Encodings.v2.HEADER_SIZE), dataLen);
            });

            it('The bytes[11...N] should be the corrected message data', function() {

                Assert.equal(
                    packet.subarray(Tv.Encodings.v2.HEADER_SIZE + W_LEN)
                        .compare(Buffer.concat(chunks)),
                    0
                );
            });
        });

        describe('Encoding PING successful response', () => {

            const [dataLen, chunks] = createRandomChunks();

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.PING,
                'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                'seq': PACKET_SEQ,
                'ct': chunks
            })));

            testHeader(
                packet,
                W_LEN + dataLen,
                Tv.Encodings.v2.ECommand.PING,
                Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                PACKET_SEQ
            );

            it('The bytes[9...10] should be the corrected message data length', function() {

                Assert.equal(packet.readUInt16LE(Tv.Encodings.v2.HEADER_SIZE), dataLen);
            });

            it('The bytes[11...N] should be the corrected message data', function() {

                Assert.equal(
                    packet.subarray(Tv.Encodings.v2.HEADER_SIZE + W_LEN)
                        .compare(Buffer.concat(chunks)),
                    0
                );
            });
        });

        describe('Encoding CLOSE request', () => {

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.CLOSE,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': null
            })));

            testHeader(
                packet,
                0,
                Tv.Encodings.v2.ECommand.CLOSE,
                Tv.Encodings.v2.EPacketType.REQUEST,
                PACKET_SEQ
            );
        });

        describe('Encoding CLOSE successful response', () => {

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const packet = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.CLOSE,
                'typ': Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                'seq': PACKET_SEQ,
                'ct': null
            })));

            testHeader(
                packet,
                0,
                Tv.Encodings.v2.ECommand.CLOSE,
                Tv.Encodings.v2.EPacketType.SUCCESS_RESPONSE,
                PACKET_SEQ
            );
        });

        describe('Encoding ERROR response', () => {

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFFFFFFFFFF);

            const ERR_1_REASON = createRandomString(259);
            const ERR_1_TEXT = `${Tv.APP_ERROR_NAMESPACE}:${ERR_1_REASON}`;
            const ERR_1_TEXT_LEN = Buffer.byteLength(ERR_1_TEXT);
            const ERR_1 = new Tv.errors.app_error(ERR_1_REASON);

            const ERR_1_P = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.API_CALL,
                'typ': Tv.Encodings.v2.EPacketType.ERROR_RESPONSE,
                'seq': PACKET_SEQ,
                'ct': ERR_1
            })));

            const ERR_2_REASON = 'api_not_found';
            const ERR_2_TEXT = `${Tv.PROTOCOL_ERROR_NAMESPACE}:${ERR_2_REASON}`;
            const ERR_2_TEXT_LEN = Buffer.byteLength(ERR_2_TEXT);
            const ERR_2 = new Tv.errors.api_not_found();

            const ERR_2_P = Buffer.concat(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.API_CALL,
                'typ': Tv.Encodings.v2.EPacketType.ERROR_RESPONSE,
                'seq': PACKET_SEQ,
                'ct': ERR_2
            })));

            it('Length of encoded packet should be corrected', function() {

                Assert.equal(ERR_1_P.byteLength, Tv.Encodings.v2.HEADER_SIZE + W_LEN + ERR_1_TEXT_LEN);
                Assert.equal(ERR_2_P.byteLength, Tv.Encodings.v2.HEADER_SIZE + W_LEN + ERR_2_TEXT_LEN);
            });

            it('The 1st byte should be the corrected command code', function() {

                Assert.equal(ERR_1_P[0], Tv.Encodings.v2.ECommand.API_CALL);
                Assert.equal(ERR_2_P[0], Tv.Encodings.v2.ECommand.API_CALL);
            });

            it('The 2nd byte should be the corrected command type', function() {

                Assert.equal(ERR_1_P[1], Tv.Encodings.v2.EPacketType.ERROR_RESPONSE);
                Assert.equal(ERR_2_P[1], Tv.Encodings.v2.EPacketType.ERROR_RESPONSE);
            });

            it('The bytes[3...8] should be the corrected packet sequence', function() {

                Assert.equal(ERR_1_P.readUInt16LE(2) * 0x1_0000_0000 + ERR_1_P.readUInt32LE(4), PACKET_SEQ);
                Assert.equal(ERR_2_P.readUInt16LE(2) * 0x1_0000_0000 + ERR_2_P.readUInt32LE(4), PACKET_SEQ);
            });

            it('The bytes[9...10] should be the corrected error message length', function() {

                Assert.equal(ERR_1_P.readUInt16LE(Tv.Encodings.v2.HEADER_SIZE), ERR_1_TEXT_LEN);
                Assert.equal(ERR_2_P.readUInt16LE(Tv.Encodings.v2.HEADER_SIZE), ERR_2_TEXT_LEN);
            });

            it('The bytes[11...N] should be the corrected error message', function() {

                Assert.equal(
                    ERR_1_P.subarray(
                        Tv.Encodings.v2.HEADER_SIZE + W_LEN,
                        Tv.Encodings.v2.HEADER_SIZE + W_LEN + ERR_1_P.readUInt16LE(Tv.Encodings.v2.HEADER_SIZE)
                    ).toString(),
                    ERR_1_TEXT,
                );
                Assert.equal(
                    ERR_2_P.subarray(
                        Tv.Encodings.v2.HEADER_SIZE + W_LEN,
                        Tv.Encodings.v2.HEADER_SIZE + W_LEN + ERR_2_P.readUInt16LE(Tv.Encodings.v2.HEADER_SIZE)
                    ).toString(),
                    ERR_2_TEXT,
                );
            });
        });

    });
});
