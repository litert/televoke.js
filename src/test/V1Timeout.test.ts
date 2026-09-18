/* eslint-disable */
/**
 * Copyright 2026 Angus.Fenying <fenying@litert.org>
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

import * as NodeAssert from 'node:assert';
import * as NodeTest from 'node:test';
import * as NodeTimers from 'node:timers/promises';
import * as Tv from '../lib';
import * as TvHttpListener from '../lib/transporters/http-listener';
import * as TvLegacyHttp from '../lib/transporters/legacy-http';

interface IApiDecl {

    testTimeout(a: string): string;
}

const router = new Tv.Servers.SimpleJsonApiRouter();

router.registerApi('testTimeout', async (ctx, a: string) => {

    await NodeTimers.setTimeout(100);
    return '12345';
});

const tvServer = new Tv.Servers.TvServer(router)
    .on('error', (e) => { console.error(e); });

const h1Server = TvHttpListener.createHttpListener({
    hostname: '0.0.0.0',
    port: 29483,
});

const h1Gw = TvLegacyHttp.createLegacyHttpGateway(h1Server, tvServer);

NodeTest.describe('Televoke v1 timeout', () => {

    NodeTest.it('B-F-00001: rejects an invocation that exceeds the client timeout', async () => {

        await h1Gw.start();

        const client = TvLegacyHttp.createLegacyHttpClient<IApiDecl>({
            port: 29483,
            hostname: '127.0.0.1',
            timeout: 50,
        });

        try {

            await NodeAssert.rejects(
                client.invoke('testTimeout', '23333'),
                Tv.errors.timeout,
            );
        }
        finally {

            await client.close();
            await h1Gw.stop();
        }
    });
});
