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

import * as FS from 'node:fs';
import * as Tv from '../../lib';
import * as LwDfx from '../../lib/transporters/lwdfx';
import { IApis, sleep, testSendingStream, testRecvStream, getClaOption, holdProcess } from './shared';

holdProcess();

(async () => {

    const client: Tv.Clients.IClient<IApis> = Tv.Clients.createJsonApiClient<IApis>(
        LwDfx.createTlsConnector({
            'port': parseInt(getClaOption('port', '9330')),
            'hostname': getClaOption('hostname', '127.0.0.1'),
            'tlsOptions': {
                'servername': 'lwdfx1.litert.org',
                'ca': FS.readFileSync(`${__dirname}/../../debug/pki/ca.pem`),
            }
        })
    );

    client.on('error', (e) => { console.error(`[Client] Unexpected error: ${e as any}`); });

    client.on('push_message', (msg) => {

        console.log('[Client] Message from server: ' + Buffer.concat(msg).toString());
    });

    do {

        await sleep(100);

        try {

            switch (([
                'debug',
                'startStream2Server',
                'startStream2Client',
                'serverShouldCloseConn',
                'clientShouldCloseConn',
                'hi',
                'shit',
            ] as const)[Math.floor(Math.random() * 7)]) {
                case 'debug':
                    console.log('[Client] [Start Invoke] debug');
                    await client.invoke('debug', `${new Date().toISOString()}: Hello, world!`);
                    console.log('[Client] [End Invoke] debug');
                    break;
                case 'shit':
                    console.log('[Client] [Start Invoke] shit');
                    try {
                        await client.invoke('shit');
                    }
                    catch (e) {
                        console.error(e);
                    }
                    console.log('[Client] [End Invoke] shit');
                    break;
                case 'hi':
                    console.log('[Client] [Start Invoke] hi');
                    console.log('Response: ' + await client.invoke('hi', new Date().toISOString() + ': Hello, world!'));
                    console.log('[Client] [End Invoke] hi');
                    break;
                case 'startStream2Server': {
                    console.log('[Client] [Start Invoke] startStream2Server');
                    const streamId = await client.invoke('startStream2Server');
                    console.log('[Client] [End Invoke] startStream2Server');
                    setImmediate(() => {
                        testSendingStream(client, streamId, 'Client').catch(console.error);
                    });
                    break;
                }
                case 'startStream2Client': {
                    console.log('[Client] [Start Invoke] startStream2Client');
                    if (!client.transporter?.writable) {

                        await client.connect();
                    }
                    const stream = client.streams.create();
                    testRecvStream(stream, 'Client');
                    await client.invoke('startStream2Client', stream.id);
                    console.log('[Client] [End Invoke] startStream2Client');
                    break;
                }
                case 'serverShouldCloseConn':
                    if (Math.random() < 0.01) {
                        console.log('[Client] [Start Invoke] serverShouldCloseConn');
                        await client.invoke('serverShouldCloseConn');
                        console.log('[Client] [End Invoke] serverShouldCloseConn');
                    }
                    break;
                case 'clientShouldCloseConn': {
                    if (Math.random() < 0.01) {
                        console.log('[Client] clientShouldCloseConn');
                        client.close();
                    }
                    break;
                }
            }
        }
        catch (e) {

            console.error('[Client] Error: ', e);
        }
    }
    while (1);

})().catch(console.error);
