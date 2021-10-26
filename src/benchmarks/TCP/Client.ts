/**
 * Copyright 2021 Angus.Fenying <fenying@litert.org>
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

import * as $Televoke from '../../lib';
import { IGa, BENCHMARK_SERVER_PORT, BENCHMARK_SERVER_HOST } from './API';

const ridGenerator = (function() {

    let i = 0;
    return () => i++;
})();

const TOTAL = 30000;

async function timer(title: string, callback: () => Promise<void>): Promise<void> {

    console.time(title);
    await callback();
    console.timeEnd(title);
}

function createTest<TK extends keyof IGa>(
    client: $Televoke.IClient<IGa>,
    total: number,
    concurrency: number,
    api: TK,
    ...args: IGa[TK] extends $Televoke.IFunction ? Parameters<IGa[TK]> : never
): () => Promise<any> {

    const helps = new Array(concurrency).fill(0);

    return async function(): Promise<void> {

        for (let i = 0; i < total; i += concurrency) {

            await Promise.all(helps.map(() => client.invoke(api, ...args)));
        }
    };
}

(async () => {

    const client = $Televoke.createTCPClient<IGa>({
        host: BENCHMARK_SERVER_HOST,
        port: BENCHMARK_SERVER_PORT,
        ridGenerator,
        timeout: 60000
    });

    await client.connect();

    console.log('Protocol: TCP');
    console.log(`Concurrency: ${TOTAL}`);

    console.log('# Stage: Preheat');

    await timer(
        `Concurrency: ${TOTAL}`,
        createTest(client, TOTAL, TOTAL, 'hi', { name: 'Angus' })
    );

    console.log('# Stage: Invoking API with async handler');

    await timer(
        `Concurrency: ${TOTAL}`,
        createTest(client, TOTAL, TOTAL, 'hi', { name: 'Angus' })
    );

    await timer(
        'Concurrency: 5',
        createTest(client, TOTAL, 5, 'hi', { name: 'Angus' })
    );

    await timer(
        'Concurrency: 10',
        createTest(client, TOTAL, 5, 'hi', { name: 'Angus' })
    );

    await timer(
        'Concurrency: 50',
        createTest(client, TOTAL, 5, 'hi', { name: 'Angus' })
    );

    await timer(
        'Concurrency: 100',
        createTest(client, TOTAL, 5, 'hi', { name: 'Angus' })
    );

    console.log('# Stage: Invoking API with sync handler');

    await timer(
        `Concurrency: ${TOTAL}`,
        createTest(client, TOTAL, TOTAL, 'Hello', { name: 'Angus' })
    );

    await timer(
        'Concurrency: 5',
        createTest(client, TOTAL, 5, 'Hello', { name: 'Angus' })
    );

    await timer(
        'Concurrency: 10',
        createTest(client, TOTAL, 5, 'Hello', { name: 'Angus' })
    );

    await timer(
        'Concurrency: 50',
        createTest(client, TOTAL, 5, 'Hello', { name: 'Angus' })
    );

    await timer(
        'Concurrency: 100',
        createTest(client, TOTAL, 5, 'Hello', { name: 'Angus' })
    );

    await client.close();

})().catch(console.error);
