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

import type * as dS from './Server.decl';
import * as Shared from '../shared';
import { buffer2json } from '../shared/Utils';
import { EventEmitter } from 'node:events';

export type ISimpleJsonApiHandler = (ctx: dS.IRequestContext, ...args: any[]) => unknown;

export type ISimpleJsonMessageHandler = (ctx: dS.IRequestContext, msg: unknown) => unknown;

export class SimpleJsonApiRouter extends EventEmitter implements dS.IRouter {

    public get encoding(): string {

        return 'json';
    }

    private readonly _apiHandlers: Record<string, ISimpleJsonApiHandler> = {};

    public registerApi(name: string, callback: ISimpleJsonApiHandler): this {

        this._apiHandlers[name] = callback;

        return this;
    }

    public processApi(cb: dS.IRouteApiCallback, name: string, body: Buffer[], ctx: dS.IRequestContext): void {

        if (!this._apiHandlers[name]) {
            cb(new Shared.errors.api_not_found({ name }));
            return;
        }

        let args: unknown;

        try {

            args = buffer2json(body);
        }
        catch (err) {

            cb(new Shared.errors.invalid_packet({ reason: 'invalid_json' }, err));
        }

        try {

            const result = Array.isArray(args) ?
                this._apiHandlers[name](ctx, ...args) :
                this._apiHandlers[name](ctx, args);

            if (result instanceof Promise) {

                result.then(
                    (data) => {

                        try {

                            cb(JSON.stringify(data ?? null));
                        }
                        catch (e) {

                            this._processError(cb, e, name);
                        }
                    },
                    (e) => { this._processError(cb, e, name); },
                );
            }
            else {

                cb(JSON.stringify(result ?? null));
            }
        }
        catch (e) {

            this._processError(cb, e, name);
        }
    }

    private _processError(cb: dS.IRouteApiCallback, e: unknown, name: string): void {

        if (e instanceof Shared.TelevokeError) {

            cb(e);
            return;
        }

        if (e instanceof Shared.TvErrorResponse) {

            cb(new Shared.errors.app_error(JSON.stringify(e.data ?? null)));
            return;
        }

        cb(new Shared.errors.server_internal_error());
        this.emit('error', new Shared.errors.unprocessable_error({ api: name }, e));
    }

    public processLegacyApi(
        cb: dS.IRouteLegacyApiCallback,
        name: string,
        args: unknown,
        ctx: dS.IRequestContext
    ): void {

        if (!this._apiHandlers[name]) {
            cb(new Shared.errors.api_not_found({ name }));
            return;
        }

        try {

            const result = Array.isArray(args) ?
                this._apiHandlers[name](ctx, ...args) :
                this._apiHandlers[name](ctx, args);

            if (result instanceof Promise) {

                result.then(
                    (data) => { cb(data ?? null); },
                    (e) => { this._processError(cb, e, name); },
                );
            }
            else {

                cb(result ?? null);
            }
        }
        catch (e) {

            this._processError(cb, e, name);
        }
    }
}
