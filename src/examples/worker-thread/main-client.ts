/**
 * Copyright 2025 Angus.Fenying <fenying@litert.org>
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
import * as NodeWorker from 'node:worker_threads';
import * as WorkerThread from '../../lib/transporters/worker-thread';
import { holdProcess } from '../shared/test-utils';
import { IApis } from '../shared/decl';
import { doClientTest } from '../shared/client';

holdProcess();

(async () => {

    const worker = new NodeWorker.Worker(`${__dirname}/worker-server.js`, {});

    const client: Tv.Clients.IClient<IApis> = Tv.Clients.createJsonApiClient<IApis>(
        WorkerThread.connectToWorkerThreadServer(worker)
    );

    await new Promise<void>((resolve) => worker.on('online', resolve));

    doClientTest(client);

})().catch(console.error);
