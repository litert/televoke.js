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

import { IRequest } from './Request';

export type IHandler<TAPI extends (...args: any[]) => any> = (...args: Parameters<TAPI>) => ReturnType<TAPI> | Promise<ReturnType<TAPI>>;

export type IHandlerEx<TAPI extends (...args: any[]) => any> = (req: IRequest<Parameters<TAPI>>, ...args: Parameters<TAPI>) => ReturnType<TAPI> | Promise<ReturnType<TAPI>>;

export interface IRouter {

    /**
     * Try routing by the API name, and return the descriptor of the API.
     *
     * @param name  The name of API requested by client.
     */
    route(name: string): unknown | null;

    /**
     * Execute the determined API.
     *
     * @param request       The context object of current request.
     * @param descriptor    The descriptor of the API.
     */
    execute(request: IRequest, descriptor: unknown): Promise<any>;

    /**
     * Validate the arguments inside the request.
     *
     * @param request       The context object of current request.
     * @param descriptor    The descriptor of the API.
     */
    validate(request: IRequest, descriptor: unknown): boolean;
}
