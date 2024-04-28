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

import * as Tv from '../../lib';
import * as WorkerThread from '../../lib/transporters/worker-thread';
import { holdProcess, testRecvStream, testSendingStream } from '../network/shared';

const router = new Tv.Servers.SimpleJsonApiRouter();

const server = new Tv.Servers.TvServer(router)
    .on('error', (e) => { console.error(e); });

router
    .registerApi('debug', (ctx, text: string): void => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked debug`);
        console.log(`[Server] Client says: ${text}`);

        if (Math.random() > 0.5) {
            console.log('[Server] Sent a message to client');
            ctx.channel.sendMessage('hello').catch(console.error);
        }
    })
    .registerApi('test_bad_response', (ctx): unknown => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked test_bad_response`);

        return {
            f: BigInt(123)
        };
    })
    .registerApi('test_bad_response_async', (ctx): Promise<unknown> => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked test_bad_response`);

        return Promise.resolve({
            f: BigInt(123)
        });
    })
    .registerApi('say', (ctx, text: string): string => {

        return text;
    })
    .registerApi('startStream2Server', (ctx): number => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked startStream2Server`);
        const stream = ctx.channel.streams.create();
        console.log(`[Server] Opened stream #${stream.id}`);

        testRecvStream(stream, 'Server');

        return stream.id;
    })
    .registerApi('serverShouldCloseConn', (ctx): void => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked serverShouldCloseConn`);

        ctx.channel.close();
    })
    .registerApi('hi', (ctx, text: string): string => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked hi`);

        return Buffer.from(text).toString('base64url');
    })
    .registerApi('shit', (ctx): string => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked shit`);

        if (Math.random() > 0.5) {
            throw { test: 'this error should be unclear to clients' };
        }
        else {
            throw new Tv.TvErrorResponse({
                test: 'this error should be visible to clients'
            });
        }
    })
    .registerApi('startStream2Client', (ctx, streamId: number): void => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked startStream2Client`);
        testSendingStream(ctx.channel, streamId, 'Server').catch(console.error);
    });

holdProcess();

const wtGateway = WorkerThread.createWorkerThreadGateway(server);

(async () => {

    await wtGateway.start();

    console.log('Server started.');

})().catch(console.error);


