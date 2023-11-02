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

(async () => {

    const router = $Televoke.createSimpleRouter();

    router.add<IGa['hi']>('hi', function(data) {

        return `Hi, ${data.name}`;
    });

    router.register<IGa['Hello']>('Hello', function(ctx) {

        return `Hello, ${ctx.args[0].name}`;
    });

    router.add<IGa['TestError']>('TestError', function(data) {

        throw `Hello, ${data.name}`;
    });

    const server = $Televoke.createServer();

    server.setRouter(router);
    server.on('error', console.error);
    server.on('handler_error', console.error);
    server.addGateway('tcp', $Televoke.createTCPGateway(BENCHMARK_SERVER_HOST, BENCHMARK_SERVER_PORT));

    await server.start();

})().catch(console.error);
