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

import * as Tv from '../lib/shared';
import * as Assert from 'node:assert';
import { createRandomChunks, createRandomString, ensureBufferArray } from './utils';

const encoder = new Tv.Encodings.v2.TvEncoderV2();
const decoder = new Tv.Encodings.v2.TvDecoderV2();

describe('Encoder/Decoder', () => {

    describe('Decoder v2', () => {

        describe('Decoding API_CALL request', () => {

            const [, chunks] = createRandomChunks();

            const API_NAME = createRandomString(128);
            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFF_FFFF_FFFF);

            const result = decoder.decode(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.API_CALL,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': {
                    'name': API_NAME,
                    'body': chunks
                }
            } satisfies Tv.Encodings.v2.IApiRequestPacket))) as Tv.Encodings.v2.IApiRequestPacket;

            it('The decoded command code should be API_CALL', function() {

                Assert.equal(result.cmd, Tv.Encodings.v2.ECommand.API_CALL);
            });

            it('The decoded command type should be REQUEST', function() {

                Assert.equal(result.typ, Tv.Encodings.v2.EPacketType.REQUEST);
            });

            it('The decoded packet sequence should be matched as it is encoded', function() {

                Assert.equal(result.seq, PACKET_SEQ);
            });

            it('The decoded API name should be matched as it is encoded', function() {

                Assert.equal(result.ct.name, API_NAME);
            });

            it('The decoded API arguments should be matched as it is encoded', function() {

                Assert.equal(Buffer.concat(ensureBufferArray(result.ct.body)).compare(Buffer.concat(chunks)), 0);
            });
        });

        describe('Decoding PING request', () => {

            const [, chunks] = createRandomChunks();

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFF_FFFF_FFFF);

            const result = decoder.decode(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.PING,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': chunks
            } satisfies Tv.Encodings.v2.IPingRequestPacket))) as Tv.Encodings.v2.IPingRequestPacket;

            it('The decoded command code should be PING', function() {

                Assert.equal(result.cmd, Tv.Encodings.v2.ECommand.PING);
            });

            it('The decoded command type should be REQUEST', function() {

                Assert.equal(result.typ, Tv.Encodings.v2.EPacketType.REQUEST);
            });

            it('The decoded packet sequence should be matched as it is encoded', function() {

                Assert.equal(result.seq, PACKET_SEQ);
            });

            it('The decoded message should be matched as it is encoded', function() {

                Assert.equal(Buffer.concat(ensureBufferArray(result.ct)).compare(Buffer.concat(chunks)), 0);
            });
        });

        describe('Decoding PUSH_MESSAGE request', () => {

            const [, chunks] = createRandomChunks();

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFF_FFFF_FFFF);

            const result = decoder.decode(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.PUSH_MESSAGE,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': chunks
            } satisfies Tv.Encodings.v2.IPushMessageRequestPacket))) as Tv.Encodings.v2.IPushMessageRequestPacket;

            it('The decoded command code should be PUSH_MESSAGE', function() {

                Assert.equal(result.cmd, Tv.Encodings.v2.ECommand.PUSH_MESSAGE);
            });

            it('The decoded command type should be REQUEST', function() {

                Assert.equal(result.typ, Tv.Encodings.v2.EPacketType.REQUEST);
            });

            it('The decoded packet sequence should be matched as it is encoded', function() {

                Assert.equal(result.seq, PACKET_SEQ);
            });

            it('The decoded message should be matched as it is encoded', function() {

                Assert.equal(Buffer.concat(ensureBufferArray(result.ct)).compare(Buffer.concat(chunks)), 0);
            });
        });

        describe('Decoding BINARY_CHUNK request', () => {

            const [, chunks] = createRandomChunks();

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFF_FFFF_FFFF);
            const STREAM_ID = Math.ceil(Math.random() * 0xFFFF_FFFF);

            const result = decoder.decode(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.BINARY_CHUNK,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': {
                    'streamId': STREAM_ID,
                    'index': 123,
                    'body': chunks
                }
            } satisfies Tv.Encodings.v2.IBinaryChunkRequestPacket))) as Tv.Encodings.v2.IBinaryChunkRequestPacket;

            it('The decoded command code should be BINARY_CHUNK', function() {

                Assert.equal(result.cmd, Tv.Encodings.v2.ECommand.BINARY_CHUNK);
            });

            it('The decoded command type should be REQUEST', function() {

                Assert.equal(result.typ, Tv.Encodings.v2.EPacketType.REQUEST);
            });

            it('The decoded packet sequence should be matched as it is encoded', function() {

                Assert.equal(result.seq, PACKET_SEQ);
            });

            it('The decoded stream id should be matched as it is encoded', function() {

                Assert.equal(result.ct.streamId, STREAM_ID);
            });

            it('The decoded chunk body should be matched as it is encoded', function() {

                Assert.equal(Buffer.concat(ensureBufferArray(result.ct.body)).compare(Buffer.concat(chunks)), 0);
            });
        });

        describe('Decoding CLOSE request', () => {

            const PACKET_SEQ = Math.ceil(Math.random() * 0xFFFF_FFFF_FFFF);

            const result = decoder.decode(ensureBufferArray(encoder.encode({
                'cmd': Tv.Encodings.v2.ECommand.CLOSE,
                'typ': Tv.Encodings.v2.EPacketType.REQUEST,
                'seq': PACKET_SEQ,
                'ct': null
            } satisfies Tv.Encodings.v2.ICloseRequestPacket))) as Tv.Encodings.v2.ICloseRequestPacket;

            it('The decoded command code should be CLOSE', function() {

                Assert.equal(result.cmd, Tv.Encodings.v2.ECommand.CLOSE);
            });

            it('The decoded command type should be REQUEST', function() {

                Assert.equal(result.typ, Tv.Encodings.v2.EPacketType.REQUEST);
            });

            it('The decoded packet sequence should be matched as it is encoded', function() {

                Assert.equal(result.seq, PACKET_SEQ);
            });

            it('The decoded payload should be null', function() {

                Assert.equal(result.ct, null);
            });
        });

    });
});
