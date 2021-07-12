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

interface IGreetArguments {

    name: string;
}

interface IGa extends $Televoke.IServiceAPIs {

    hi(data: IGreetArguments): string;

    /* eslint-disable @typescript-eslint/naming-convention */
    Hello(data: IGreetArguments): string;

    TestError(data: IGreetArguments): string;
    /* eslint-enable @typescript-eslint/naming-convention */
}

(async () => {

    const client = $Televoke.createHttpsClient<IGa>({
        host: 'examples.org',
        ridGenerator: $Televoke.createIncreasementRIDGenerator(0),
        path: '/path/to/rpc/entry'
    });

    await client.connect();

    console.log(await client.invoke('hi', {'name': 'Mick'}));
    console.log(await client.call('Hello', {'name': 'Angus'}));

    // @ts-ignore
    await client.invoke('not-exists-api', {'name': 'V'}).catch((e) => console.error(e.toString()));
    await client.invoke('TestError', {'name': 'V'}).catch((e) => console.error(e.toString()));

    await client.close();

})().catch(console.error);
