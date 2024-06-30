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
import { getClaOption } from '../shared/test-utils';
import { IApis } from '../shared/decl';

function syncSleep(ms: number): void {

    const STARTED_AT = Date.now();

    while (1) {

        if (Date.now() - STARTED_AT >= ms) {

            break;
        }
    }
}

async function testLegacyHttpDisabledRetry(): Promise<void> {
    
    const client: Tv.Clients.IClient<IApis> = Tv.Clients.createLegacyHttpClient<IApis>({
        port: parseInt(getClaOption('port', '8080')),
        hostname: getClaOption('hostname', '127.0.0.1'),
        retryOnConnReset: false,
    });

    client.on('error', (e) => console.error(`[Client] Unexpected error: ${e}`));

    console.log('------------- [LegacyHttp] Test: Disabled Retry --------------');

    console.log('- Case: Normal Invoke');
    try {

        await client.invoke('echo', new Date() + ': Hello, world!');

        console.info('    PASSED: No exception thrown.');
    }
    catch (e) {

        console.error('    FAILED: Exception thrown.');
        console.error(e);
    }

    console.log('- Case: Invoke after CPU stuck for 10s');

    syncSleep(10_000);

    try {

        await client.invoke('echo', new Date() + ': Hello, world!');

        console.error('    FAILED: No exception thrown.');
    }
    catch (e) {

        console.info('    PASSED: Exception thrown: ' + (e as any)?.code);
    }

    client.close();
}

async function testLegacyHttpEnabledRetry(): Promise<void> {
    
    const client: Tv.Clients.IClient<IApis> = Tv.Clients.createLegacyHttpClient<IApis>({
        'port': parseInt(getClaOption('port', '8080')),
        'hostname': getClaOption('hostname', '127.0.0.1'),
    });

    client.on('error', (e) => console.error(`[Client] Unexpected error: ${e}`));

    console.log('------------- [LegacyHttp] Test: Enabled Retry --------------');

    console.log('- Case: Normal Invoke');
    try {

        await client.invoke('echo', new Date() + ': Hello, world!');

        console.info('    PASSED: No exception thrown.');
    }
    catch (e) {

        console.error('    FAILED: Exception thrown.');
        console.error(e);
    }

    console.log('- Case: Invoke after CPU stuck for 10s');

    syncSleep(10_000);

    try {

        await client.invoke('echo', new Date() + ': Hello, world!');

        console.info('    PASSED: No exception thrown.');
    }
    catch (e) {

        console.error('    FAILED: Exception thrown.');
        console.error(e);
    }

    client.close();
}

(async () => {

    await testLegacyHttpDisabledRetry();
    await testLegacyHttpEnabledRetry();

})().catch(console.error);
