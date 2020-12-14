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

import * as G from '../Common';
import { Events } from '@litert/observable';

export type IRIDGenerator = () => string | number;

export interface IResponse<T> extends G.IRawResponse<T> {

    /**
     * The time when client sent the request.
     */
    cst: number;

    /**
     * The time when client received the response.
     */
    crt: number;
}

export interface IClient<TAPIs extends G.IServiceAPIs = G.IServiceAPIs> extends Events.IObservable<Events.ICallbackDefinitions> {

    connect(): Promise<void>;

    /**
     * Call an API and get the result.
     *
     * @param api   The name of API.
     * @param args  The arguments of API.
     */
    invoke<TKey extends keyof TAPIs>(api: TKey, ...args: Parameters<TAPIs[TKey]>): Promise<ReturnType<TAPIs[TKey]>>;

    /**
     * Call an API and get the raw response packet of result.
     *
     * @param api   The name of API.
     * @param args  The arguments of API.
     */
    call<TKey extends keyof TAPIs>(api: TKey, ...args: Parameters<TAPIs[TKey]>): Promise<IResponse<TAPIs[TKey]>>;

    close(): Promise<void>;
}
