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

import * as Crypto from 'node:crypto';
import * as Tv from '../../lib';
import type { IApis } from './decl';
import { sleep } from './test-utils';
import { Logger } from './log';

function sumBuffer(d: Buffer, b: number): number {

    for (let i = 0; i < d.length; i++) {

        b += d[i];
    }

    return b;
}

export function testRecvStream(stream: Tv.IBinaryReadStream, logger: Logger): void {

    let sum = 0;

    const subject = `Stream #${stream.id}`;

    stream.on('data', (chunk) => {

        sum = sumBuffer(chunk, sum);

    }).on('end', () => {

        if (stream.readableAborted) {

            logger.warning(`${subject} aborted`);
        }
        else {

            logger.ok(`${subject} all received, sum = ${sum}`);
        }

    }).on('error', (e) => {

        if (e instanceof Tv.errors.stream_aborted) {
            logger.warning(`${subject} aborted`);
        }
        else if (e instanceof Tv.errors.timeout) {
            logger.warning(`${subject} timeout`);
        }
        else {
            logger.error(`${subject} unexpected error: ${e}`);
        }
    });
}

export async function testSendingStream(
    ch: Pick<Tv.Clients.IClient<IApis>, 'sendBinaryChunk'>,
    streamId: number,
    logger: Logger
): Promise<void> {

    const buffers = new Array(Math.ceil(Math.random() * 10))
        .fill(0)
        .map(() => Crypto.randomBytes(Math.ceil(Math.random() * 1024)));

    let sum = 0;

    let i = 0;

    const subject = `Stream #${streamId}`;

    for (const [idx, p] of buffers.entries()) {

        sum = sumBuffer(p, sum);

        if (Math.random() > 0.9) {

            logger.warning(`${subject} aborted at chunk#${i} of ${p.length} bytes.`);

            await ch.sendBinaryChunk(streamId, false, null);
            return;
        }

        logger.ok(`Sending chunk#${i++} of ${p.length} bytes to ${subject}`);
        await ch.sendBinaryChunk(streamId, idx, p);

        await sleep(Math.ceil(1000 * Math.random()));
    }

    await ch.sendBinaryChunk(streamId, buffers.length, null);

    logger.ok(`[${subject}] Stream #${streamId} all sent, sum = ${sum}`);
}
