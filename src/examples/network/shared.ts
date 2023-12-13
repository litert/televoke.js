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

import * as Crypto from 'node:crypto';
import * as Tv from '../../lib';

export interface IApis {

    debug(text: string): void;

    say(text: string): void;

    startStream2Server(): number;

    startStream2Client(streamId: number): void;

    serverShouldCloseConn(): void;

    hi(text: string): string;

    shit(): string;

    test_bad_response(): unknown;

    test_bad_response_async(): unknown;
}

function sumBuffer(d: Buffer, b: number): number {

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < d.length; i++) {

        b += d[i];
    }

    return b;
}

export function testRecvStream(stream: Tv.IBinaryReadStream, endpoint: 'Client' | 'Server'): void {

    let sum = 0;
    stream.on('data', (chunk) => {

        sum = sumBuffer(chunk, sum);

    }).on('end', () => {

        if (stream.readableAborted) {

            console.log(`[${endpoint}] Stream #${stream.id} aborted`);
        }
        else {

            console.log(`[${endpoint}] Stream #${stream.id} all received, sum = ${sum}`);
        }

    }).on('error', (e) => {

        console.error(`[${endpoint}] Stream #${stream.id} error: `, e);
    });
}

export async function testSendingStream(
    ch: Pick<Tv.Clients.IClient<IApis>, 'sendBinaryChunk'>,
    streamId: number,
    endpoint: 'Client' | 'Server'
): Promise<void> {

    const buffers = new Array(Math.ceil(Math.random() * 10))
        .fill(0)
        .map(() => Crypto.randomBytes(Math.ceil(Math.random() * 1024)));

    let sum = 0;

    let i = 0;

    for (const [idx, p] of buffers.entries()) {

        sum = sumBuffer(p, sum);

        if (Math.random() > 0.9) {

            console.log(`[${endpoint}] Aborting stream #${streamId} at chunk#${i} of ${p.length} bytes.`);

            await ch.sendBinaryChunk(streamId, false, null);
            return;
        }

        console.log(`[${endpoint}] Sending chunk#${i++} of ${p.length} bytes to stream #${streamId}`);
        await ch.sendBinaryChunk(streamId, idx, p);

        await sleep(Math.ceil(1000 * Math.random()));
    }

    await ch.sendBinaryChunk(streamId, buffers.length, null);

    console.log(`[${endpoint}] Stream #${streamId} all sent, sum = ${sum}`);
}

export function sleep(ms: number): Promise<void> {

    return new Promise((resolve) => {

        setTimeout(resolve, ms);
    });
}
