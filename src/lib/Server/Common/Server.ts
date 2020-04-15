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

import { IGateway } from './Gateway';
import { IRouter } from './Router';
import { Events } from '@litert/observable';

export interface IServerEvents extends Events.ICallbackDefinitions {

    'handler_error'(e: unknown): void;
}

export interface IServer extends Events.IObservable<IServerEvents> {

    addGateway(name: string, gateway: IGateway): this;

    removeGateway(name: string): this;

    setRouter(router: IRouter): this;

    start(): Promise<void>;

    close(): Promise<void>;
}
