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
import * as Tv from '../lib';
import * as Memory from '../lib/transporters/memory';

const router = new Tv.Servers.SimpleJsonApiRouter();

const server = new Tv.Servers.TvServer(router);

interface IApis {

    debug(text: string): void;

    startStream2Server(): number;

    startStream2Client(streamId: number): void;
}

function sumBuffer(d: Buffer, b: number): number {

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < d.length; i++) {

        b += d[i];
    }

    return b;
}

router
    .registerApi('debug', (ctx, text: string): void => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked debug`);
        console.log(`[Server] Client says: ${text}`);

        if (Math.random() > 0.5) {
            console.log('[Server] Sent a message to client');
            ctx.channel.sendMessage('hello').catch(console.error);
        }
    })
    .registerApi('startStream2Server', (ctx): number => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked startStream2Server`);
        const stream = ctx.channel.streams.create();
        console.log(`[Server] Opened stream #${stream.id}`);

        testRecvStream(stream, 'Server');

        return stream.id;
    })
    .registerApi('startStream2Client', (ctx, streamId: number): void => {

        console.log(`[Server] Channel#${ctx.channel.id} invoked startStream2Client`);
        testSendingStream(ctx.channel, streamId, 'Server').catch(console.error);
    });

const memoryGateway = Memory.createServer({ name: 'hello', 'server': server }, (s) => {

    server.registerChannel(s);
});

function sleep(ms: number): Promise<void> {

    return new Promise((resolve) => {

        setTimeout(resolve, ms);
    });
}

// setInterval(() => { return; }, 1000);

function testRecvStream(stream: Tv.IBinaryReadStream, endpoint: 'Client' | 'Server'): void {

    let sum = 0;
    stream.on('data', (chunk) => {

        sum = sumBuffer(chunk, sum);

    }).on('end', () => {

        console.log(`[${endpoint}] Stream #${stream.id} all received, sum = ${sum}`);
    });
}

async function testSendingStream(
    ch: Pick<Tv.Clients.IClient<IApis>, 'sendBinaryChunk'>,
    streamId: number,
    endpoint: 'Client' | 'Server'
): Promise<void> {

    const buffers = new Array(Math.ceil(Math.random() * 10))
        .fill(0)
        .map(() => Crypto.randomBytes(Math.ceil(Math.random() * 1024)));

    let sum = 0;

    for (const [i, p] of buffers.entries()) {

        sum = sumBuffer(p, sum);

        await ch.sendBinaryChunk(streamId, i, p);

        await sleep(Math.floor(1000 * Math.random()));
    }

    await ch.sendBinaryChunk(streamId, buffers.length, null);

    console.log(`[${endpoint}]: Stream #${streamId} all sent, sum = ${sum}`);
}

(async () => {

    await memoryGateway.start();

    console.log(`Server [${memoryGateway.name}] started.`);

    const client: Tv.Clients.IClient<IApis> = Tv.Clients.createJsonApiClient<IApis>(
        Memory.createConnector(memoryGateway.name)
    );

    client.on('push_message', (msg) => {

        console.log('[Client] Message from server: ' + Buffer.concat(msg).toString());
    });

    do {

        await sleep(100);

        switch ((['debug', 'startStream2Server', 'startStream2Client'] as const)[Math.floor(Math.random() * 3)]) {
            case 'debug':
                await client.invoke('debug', new Date() + ': Hello, world!');
                break;
            case 'startStream2Server':
                testSendingStream(client, await client.invoke('startStream2Server'), 'Client')
                    .catch(console.error);
                break;
            case 'startStream2Client': {
                const stream = client.streams.create();
                await client.invoke('startStream2Client', stream.id);
                testRecvStream(stream, 'Client');
                break;
            }
        }
    }
    while (1);

})().catch(console.error);
