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

import * as $Televoke from '../lib';

const encoder = $Televoke.createEncoder();

const writer: $Televoke.IWritable = {
    write(b, c) {

        if (c) { c(); }
    },
    writable: true
};

const data = {
    ttl: 123,
    api: 'createUser',
    args: {
        'email': 'fenying@litert.org',
        'password': 'qwer1234',
        'magics': Array(100).fill(0).map(() => Math.random().toString())
    },
    rid: 'fsafas09fum02x01f0,f1xfsdafasd',
    rat: Date.now()
};

function testSync(times: number): void {

    console.time('Rolling[Sync]');

    for (let x = 0; x < times; x++);

    console.timeEnd('Rolling[Sync]');

    console.time('Encoder[Sync]');

    for (let x = 0; x < times; x++) {

        encoder.encode(writer, data);
    }

    console.timeEnd('Encoder[Sync]');

    console.time('JSON.stringify[Sync]');

    for (let x = 0; x < times; x++) {

        JSON.stringify(data);
    }

    console.timeEnd('JSON.stringify[Sync]');
}

testSync(1000000);

function testAsync(times: number): void {

    encoder.encode({
        write(b, c) {

            if (c) { setImmediate(c); }
        },
        writable: true
    }, data);

    if (!(times-- && setImmediate(testAsync, times))) {

        console.timeEnd('Encoder[Async]');
    }
}

console.time('Encoder[Async]');

testAsync(1000000);
