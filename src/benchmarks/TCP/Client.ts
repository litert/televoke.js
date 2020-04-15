/**
 * Copyright 2020 Angus.Fenying <fenying@litert.org>
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

const CONCURRENCY = 30000;

(async () => {

    const client = $Televoke.createTCPClient<IGa>(BENCHMARK_SERVER_HOST, BENCHMARK_SERVER_PORT, ridGenerator, 60000);

    await client.connect();

    await Promise.all(Array(CONCURRENCY).fill(0).map(() => client.invoke('hi', {name: 'Angus'})));

    for (let i = 0; i < CONCURRENCY; i++) {

        await client.invoke('hi', {name: 'Angus'});
    }

    console.time(`TCP ${CONCURRENCY} Invokes Concurrent`);
    await Promise.all(Array(CONCURRENCY).fill(0).map(() => client.invoke('hi', {name: 'Angus'})));
    console.timeEnd(`TCP ${CONCURRENCY} Invokes Concurrent`);

    console.time(`TCP ${CONCURRENCY} Invokes Sequence`);
    for (let i = 0; i < CONCURRENCY; i++) {

        await client.invoke('hi', {name: 'Angus'});
    }
    console.timeEnd(`TCP ${CONCURRENCY} Invokes Sequence`);

    console.time(`TCP ${CONCURRENCY} Calls Concurrent`);
    await Promise.all(Array(CONCURRENCY).fill(0).map(() => client.call('hi', {name: 'Angus'})));
    console.timeEnd(`TCP ${CONCURRENCY} Calls Concurrent`);

    console.time(`TCP ${CONCURRENCY} Calls Sequence`);
    for (let i = 0; i < CONCURRENCY; i++) {

        await client.call('hi', {name: 'Angus'});
    }
    console.timeEnd(`TCP ${CONCURRENCY} Calls Sequence`);

    await client.close();

})().catch(console.error);
