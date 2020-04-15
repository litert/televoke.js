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

import * as C from './Common';

export interface ISimpleRouter extends C.IRouter {

    add<A extends (...args: any[]) => any>(apiName: string, handler: C.IHandler<A>): this;

    register<A extends (...args: any[]) => any>(apiName: string, handler: C.IHandlerEx<A>): this;

    removeHandler(apiName: string): this;
}

class SimpleRouter implements ISimpleRouter {

    private _handlers: Record<string, [any, boolean]> = {};

    public add<A extends (...args: any[]) => any>(apiName: string, handler: C.IHandler<A>): this {

        this._handlers[apiName] = [handler, true];
        return this;
    }

    public register<A extends (...args: any[]) => any>(apiName: string, handler: C.IHandlerEx<A>): this {

        this._handlers[apiName] = [handler, false];
        return this;
    }

    public removeHandler(apiName: string): this {

        delete this._handlers[apiName];
        return this;
    }

    public route(name: string): [any, boolean] | void {

        return this._handlers[name];
    }
}

export function createSimpleRouter(): ISimpleRouter {

    return new SimpleRouter();
}
