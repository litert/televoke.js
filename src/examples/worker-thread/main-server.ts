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
import { router } from '../shared/router';

const server = new Tv.Servers.TvServer(router)
    .on('error', (e) => { console.error(e); });

const wtGateway = WorkerThread.createMainThreadGateway(server);

holdProcess();

(async () => {

    await wtGateway.start();

    const worker = new NodeWorker.Worker(`${__dirname}/worker-client.js`, {})
        .on('online', () => {
            wtGateway.registerWorker(worker);
        });

    console.log('Server started.');

})().catch(console.error);
