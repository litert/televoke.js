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

import { IRawRequest, IRawResponse } from '../../Common';

export type IReplyCallbak = (data: IRawResponse) => void;

export interface IGateway {

    readonly host: string;

    readonly port: number;

    onRequest?: (
        request: IRawRequest,
        reply: IReplyCallbak
    ) => void;

    onError?: (e: unknown) => void;

    start(): Promise<void>;

    close(): Promise<void>;
}
