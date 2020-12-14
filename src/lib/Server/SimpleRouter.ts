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
import { IRequest } from './Common';

export interface ISimpleRouter extends C.IRouter {

    /**
     * Register an API with a handler receiving API arguments only.
     *
     * @param apiName   The name of the API
     * @param handler   The handler of API.
     */
    add<T extends (...args: any[]) => any>(apiName: string, handler: C.IHandler<T>): this;

    /**
     * Register an API with a handler receiving context object of the request as the first argument,
     * and receive the API arguments as the rest arguments of function.
     *
     * @param apiName   The name of the API
     * @param handler   The handler of API.
     */
    register<T extends (...args: any[]) => any>(apiName: string, handler: C.IHandlerEx<T>): this;

    /**
     * Unregister an API.
     *
     * @param apiName The name of API.
     */
    removeHandler(apiName: string): this;
}

class SimpleRouter implements ISimpleRouter {

    private _handlers: Record<string, [any, boolean]> = {};

    public add<T extends (...args: any[]) => any>(apiName: string, handler: C.IHandler<T>): this {

        this._handlers[apiName] = [handler, true];
        return this;
    }

    public register<T extends (...args: any[]) => any>(apiName: string, handler: C.IHandlerEx<T>): this {

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

    public execute(request: IRequest, descriptor: [C.IHandler<any>, boolean]): Promise<any> {

        if (descriptor[1]) {

            return descriptor[0](...request.args);
        }
        else {

            return descriptor[0](request, ...request.args);
        }
    }

    public validate(request: IRequest): boolean {

        return Array.isArray(request.args);
    }
}

export function createSimpleRouter(): ISimpleRouter {

    return new SimpleRouter();
}
