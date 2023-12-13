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

import * as FS from 'node:fs';
import * as Tv from '../../lib';
import * as LwDfx from '../../lib/transporters/lwdfx';
import * as LegacyHttp from '../../lib/transporters/legacy-http';
import * as HttpListener from '../../lib/transporters/http-listener';
import * as WebSocket from '../../lib/transporters/websocket';
import { testRecvStream, testSendingStream } from './shared';

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

const lwdfxTcpGateway = LwDfx.createTcpGateway(server, {
    port: parseInt(process.argv[3] ?? '8698'),
    hostname: process.argv[2] ?? '127.0.0.1',
});

const lwdfxTlsGateway = LwDfx.createTlsGateway(server, {
    port: parseInt(process.argv[3] ?? '9330'),
    hostname: process.argv[2] ?? '127.0.0.1',
    tlsOptions: {
        cert: FS.readFileSync(`${__dirname}/../../debug/pki/newcerts/server-lwdfx1.litert.org.fullchain.pem`),
        key: FS.readFileSync(`${__dirname}/../../debug/pki/private/server-lwdfx1.litert.org.key.pem`),
    }
});

const httpListener = HttpListener.createHttpListener({
    port: parseInt(process.argv[4] ?? '8080'),
    hostname: process.argv[2] ?? '127.0.0.1',
});

const httpUnixListener = HttpListener.createHttpUnixSocketListener({
    socketPath: '/tmp/televoke2-http.sock'
});

const httpsListener = HttpListener.createHttpsListener({
    port: parseInt(process.argv[4] ?? '10443'),
    hostname: process.argv[2] ?? '127.0.0.1',
    tlsOptions: {
        cert: FS.readFileSync(`${__dirname}/../../debug/pki/newcerts/server-https.litert.org.fullchain.pem`),
        key: FS.readFileSync(`${__dirname}/../../debug/pki/private/server-https.litert.org.key.pem`),
    }
});

const legacyHttpGateway = LegacyHttp.createLegacyHttpGateway(httpListener, server)
    .on('error', (e) => {

        console.error('HttpGateway Error:', e);
    });

const legacyHttpUnixGateway = LegacyHttp.createLegacyHttpGateway(httpUnixListener, server)
    .on('error', (e) => {

        console.error('HttpGateway Error:', e);
    });

const legacyHttpsGateway = LegacyHttp.createLegacyHttpGateway(httpsListener, server)
    .on('error', (e) => {

        console.error('HttpsGateway Error:', e);
    });

const wsGateway = WebSocket.createWebsocketGateway(httpListener, server);
const wssGateway = WebSocket.createWebsocketGateway(httpsListener, server);
const wsUnixGateway = WebSocket.createWebsocketGateway(httpUnixListener, server);

const lwdfxUnixGateway = LwDfx.createUnixSocketGateway(server, {
    path: process.argv[6] ?? '/tmp/televoke2-lwdfx.sock',
});

(async () => {

    await lwdfxTcpGateway.start();
    await lwdfxTlsGateway.start();
    await lwdfxUnixGateway.start();

    await legacyHttpGateway.start();
    await legacyHttpsGateway.start();
    await legacyHttpUnixGateway.start();

    await wsGateway.start();
    await wssGateway.start();
    await wsUnixGateway.start();

    console.log('Server started.');

})().catch(console.error);
