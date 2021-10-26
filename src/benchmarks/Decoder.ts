/**
 * Copyright 2021 Angus.Fenying <fenying@litert.org>
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

import * as $Televoke from '../lib';

const decoder = $Televoke.createDecoder();

const TEST_ROLLS = parseInt(process.argv[2] ?? '10000');

while (1) {

    const DATA_STRING = JSON.stringify({
        ttl: 123,
        api: 'createUser',
        args: {
            'email': 'fenying@litert.org',
            'password': 'qwer1234',
            'magics': Array(100).fill(0).map(() => Math.random().toString())
        },
        rid: 'fsafas09fum02x01f0,f1xfsdafasd',
        rat: Date.now()
    });

    const BYTE_LENGTH = Buffer.byteLength(DATA_STRING);

    const QTY = Math.floor(10 * Math.random()) + 1;

    console.log('Packets:', QTY * TEST_ROLLS);

    const PACKET_LENGTH = 8 + BYTE_LENGTH;

    console.log('Packet Size:', PACKET_LENGTH);

    const DATA_BUFFER = Buffer.allocUnsafe(PACKET_LENGTH * QTY);

    DATA_BUFFER.writeUInt32LE(1, 0);
    DATA_BUFFER.writeUInt32LE(BYTE_LENGTH, 4);

    DATA_BUFFER.write(DATA_STRING, 8);

    for (let i = 1; i < QTY; i++) {

        DATA_BUFFER.copy(DATA_BUFFER, PACKET_LENGTH * i);
    }

    decoder.onData = (): void => void 0;

    decoder.onLogicError = console.error;
    decoder.onProtocolError = console.error;

    const SEGS: Array<[number, number]> = [[0, Math.floor(Math.random() * 10) + 4]];

    for (let i = SEGS[0][1]; i < DATA_BUFFER.byteLength;) {

        const END = Math.floor(Math.random() * (DATA_BUFFER.byteLength - i)) + 1;
        SEGS.push([i, i + END]);
        i += END;
    }

    console.log('Segments:', SEGS.length * TEST_ROLLS);

    console.time('Decoder[Sync]');

    for (let i = 0; i < TEST_ROLLS; i++) {

        decoder.decode(DATA_BUFFER);
    }

    console.timeEnd('Decoder[Sync]');

    console.time('Random[Sync]');

    for (let i = 0; i < TEST_ROLLS; i++) {

        for (const seg of SEGS) {

            decoder.decode(DATA_BUFFER.slice(seg[0], seg[1]));
        }
    }

    console.timeEnd('Random[Sync]');
}
