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

(async () => {

    const client = $Televoke.createHttpClient<IGa>(BENCHMARK_SERVER_HOST, BENCHMARK_SERVER_PORT, Math.random);

    await client.connect();

    console.time('TCP Invoke Concurrent');
    await Promise.all(Array(10000).fill(0).map(() => client.invoke('hi', {name: 'Angus'})));
    console.timeEnd('TCP Invoke Concurrent');

    console.time('TCP Invoke Sequence');
    for (let i = 0; i < 10000; i++) {

        await client.invoke('hi', {name: 'Angus'});
    }
    console.timeEnd('TCP Invoke Sequence');

    console.time('TCP Call Concurrent');
    await Promise.all(Array(10000).fill(0).map(() => client.call('hi', {name: 'Angus'})));
    console.timeEnd('TCP Call Concurrent');

    console.time('TCP Call Sequence');
    for (let i = 0; i < 10000; i++) {

        await client.call('hi', {name: 'Angus'});
    }
    console.timeEnd('TCP Call Sequence');

    await client.close();

})().catch(console.error);
