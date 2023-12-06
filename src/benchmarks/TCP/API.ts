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

import * as $Televoke from '../../lib';

export const BENCHMARK_SERVER_HOST = '127.0.0.1';
export const BENCHMARK_SERVER_PORT = 9988;

export interface IGreetArguments {

    name: string;
}

export interface IGa extends $Televoke.IServiceAPIs {

    /* eslint-disable @typescript-eslint/naming-convention */
    hi(data: IGreetArguments): string;

    Hello(data: IGreetArguments): string;

    TestError(data: IGreetArguments): string;
    /* eslint-enable @typescript-eslint/naming-convention */
}
