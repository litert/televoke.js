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

import * as $Televoke from '../lib';
import * as $Http from 'http';
import * as Timers from 'node:timers/promises';

function getClaOption(name: string, defaultValue: string): string {

    const ret = process.argv.find(i => i.startsWith(`--${name}=`));

    return ret?.slice(name.length + 3).trim() ?? defaultValue;
}

interface IGreetArguments {

    name: string;
}

const SERVER_PORT = '8899';

function requestByHttp(method: 'POST' | 'PUT', data: string, headers: Record<string, string>): Promise<string> {

    const req = $Http.request({
        hostname: getClaOption('hostname', '127.0.0.1'),
        port: parseInt(getClaOption('port', SERVER_PORT)),
        method,
        path: '/',
        headers,
    });

    const ret = new Promise<string>((resolve, reject) => {

        req.on('response', resp => {

            const chunks: Buffer[] = [];

            resp.on('data', (chunk: Buffer) => chunks.push(chunk));

            resp.on('end', () => {

                resolve(Buffer.concat(chunks).toString());
            });

            resp.on('error', reject);
        });
        req.on('error', reject);
    });

    req.end(data);

    return ret;
}

interface IGa extends $Televoke.IServiceAPIs {

    hi(data: IGreetArguments): string;

    debug(text: string): void;

    /* eslint-disable @typescript-eslint/naming-convention */
    Hello(data: IGreetArguments): string;

    TestError(data: IGreetArguments): string;
    /* eslint-enable @typescript-eslint/naming-convention */
}

(async () => {

    const router = $Televoke.createSimpleRouter();

    router.add<IGa['hi']>('hi', async function(data) {

        return `Hi, ${data.name}`;
    });

    router.register<IGa['Hello']>('Hello', async function(ctx, data) {

        return `Hello, ${data.name} (Request ID: ${ctx.rid}) from ${ctx.ip}`;
    });

    router.add<IGa['TestError']>('TestError', async function(data) {

        throw `Hello, ${data.name}`;
    });

    const server = $Televoke.createServer();

    const client = $Televoke.createHttpClient<IGa>({
        host: getClaOption('hostname', '127.0.0.1'),
        port: parseInt(getClaOption('port', SERVER_PORT)),
        ridGenerator: $Televoke.createIncrementRIDGenerator(0)
    });

    server.setRouter(router);
    server.on('error', console.error);
    server.on('handler_error', console.error);
    server.addGateway('tcp', $Televoke.createHttpGateway('127.0.0.1', 8899));

    await server.start();

    await client.connect();

    console.log(await client.invoke('debug', 'hello'));
    console.log(await client.invoke('hi', {'name': 'Mick'}));
    console.log(await client.call('Hello', {'name': 'Angus'}));

    // @ts-ignore
    await client.invoke('not-exists-api', {'name': 'V'}).catch((e) => console.error(e.toString()));
    await client.invoke('TestError', {'name': 'V'}).catch((e) => console.error(e.toString()));

    await client.close();

    console.log(await requestByHttp('POST', '{1}', {}));

    await Timers.setTimeout(100);

    console.log(await requestByHttp('POST', '{1}', {'content-length': '1111111111111'}));

    await Timers.setTimeout(100);

    console.log(await requestByHttp('POST', '1}', {}));

    await Timers.setTimeout(100);

    console.log(await requestByHttp('PUT', '{"fffff":', {}));

    try {

        await client.invoke('hi', {'name': 'Mick'});
        const T = Date.now();

        while (1) {

            if (T < Date.now() - 10000) {

                break;
            }
        }

        console.log(await client.invoke('hi', {'name': 'Mick'}));

        console.info('Failed: Should got ECONNRESET here.');
    }
    catch (e) {

        console.error('PASSED: Got ECONNRESET here when CPU stuck for 10s');
        console.error(e);
    }

    const client2 = $Televoke.createHttpClient<IGa>({
        host: '127.0.0.1',
        port: 8899,
        ridGenerator: $Televoke.createIncrementRIDGenerator(0),
        retryConnReset: true,
    });

    try {

        await client2.invoke('hi', {'name': 'Mick'});
        const T = Date.now();

        while (1) {

            if (T < Date.now() - 10000) {

                break;
            }
        }

        console.log(await client2.invoke('hi', {'name': 'Mick'}));

        console.info('PASSED: No ECONNRESET here even if CPU stuck for 10s');
    }
    catch (e) {

        console.error('Failed: Still got error here.');
        console.error(e);
    }

    await server.close();

})().catch((e) => {

    console.error(e)
});
