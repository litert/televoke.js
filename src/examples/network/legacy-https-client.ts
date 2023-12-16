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
import { IApis, getClaOption, holdProcess, sleep } from './shared';

holdProcess();

(async () => {

    const client: Tv.Clients.IClient<IApis> = Tv.Clients.createLegacyHttpClient<IApis>({
        'port': parseInt(getClaOption('port', '10443')),
        'hostname': getClaOption('hostname', '127.0.0.1'),
        'https': true,
        'servername': 'https.litert.org',
        'ca': FS.readFileSync(`${__dirname}/../../debug/pki/ca.pem`),
    });

    client.on('error', (e) => console.error(`[Client] Unexpected error: ${e}`));

    do {

        await sleep(100);

        try {

            switch (([
                'debug',
                'hi',
                'shit',
            ] as const)[Math.floor(Math.random() * 3)]) {
                case 'debug':
                    console.log('[Client] [Start Invoke] debug');
                    await client.invoke('debug', new Date() + ': Hello, world!');
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
                    console.log('Response: ' + await client.invoke('hi', new Date() + ': Hello, world!'));
                    console.log('[Client] [End Invoke] hi');
                    break;
            }
        }
        catch (e) {

            console.error('[Client] Error: ', e);
        }
    }
    while (1);

})().catch(console.error);
