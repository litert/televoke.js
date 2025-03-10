/**
 * Copyright 2025 Angus.Fenying <fenying@litert.org>
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
import * as WebSocket from '../../lib/transporters/websocket';
import { getClaOption, holdProcess, sleep } from '../shared/test-utils';
import { IApis } from '../shared/decl';

holdProcess();

(async () => {

    const timeout = parseInt(getClaOption('timeout', '0'));
    const connectTimeout = parseInt(getClaOption('connect-timeout', '3000'));
    const invokeInterval = parseInt(getClaOption('invoke-interval', '10000'));

    console.log('Using timeout: ' + timeout);
    console.log('Using connectTimeout: ' + connectTimeout);

    const client: Tv.Clients.IClient<IApis> = Tv.Clients.createJsonApiClient<IApis>(
        WebSocket.createWsConnector({
            'port': parseInt(getClaOption('port', '8080')),
            'hostname': getClaOption('hostname', '127.0.0.1'),
            'timeout': timeout,
            'connectTimeout': connectTimeout,
        })
    );

    client.on('error', (e) => console.error(`[Client] Unexpected error: ${e}`));

    client.on('push_message', (msg) => {

        console.log('[Client] Message from server: ' + Buffer.concat(msg).toString());
    });

    while (1) {

        await client.invoke('echo', new Date() + ': Hello, world!');

        await sleep(invokeInterval);
    }


})().catch(console.error);
