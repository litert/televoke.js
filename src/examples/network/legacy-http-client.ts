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
import { doClientTest } from '../shared/client';
import { getClaOption, holdProcess } from '../shared/test-utils';
import { IApis } from '../shared/decl';

holdProcess();

(async () => {

    const client: Tv.Clients.IClient<IApis> = Tv.Clients.createLegacyHttpClient<IApis>({
        port: parseInt(getClaOption('port', '8080')),
        hostname: getClaOption('hostname', '127.0.0.1'),
    });

    doClientTest(client, true);

})().catch(console.error);
