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

import * as Http from 'node:http';
import type * as Shared from '../../shared';

const PROPERTY_NAMES = ['remoteAddress', 'remotePort', 'localAddress', 'localPort', 'url', 'headers'];

export class LegacyHttpTransporter implements Shared.ITransporter {

    public readonly protocol = 'http';

    public constructor(
        private readonly _req: Http.IncomingMessage,
    ) {

    }

    public readonly writable = false;

    public getPropertyNames(): string[] {

        return PROPERTY_NAMES;
    }

    public getAllProperties(): Record<string, unknown> {

        return {
            'remoteAddress': this._req.socket.remoteAddress,
            'remotePort': this._req.socket.remotePort,
            'localAddress': this._req.socket.localAddress,
            'localPort': this._req.socket.localPort,
            'url': this._req.url,
            'headers': this._req.headers,
        };
    }

    public getProperty(name: string): unknown {

        switch (name) {
            case 'localPort':
            case 'localAddress':
            case 'remotePort':
            case 'remoteAddress':
                return this._req.socket[name];
            case 'url':
            case 'headers':
                return this._req[name];
            default:
                return undefined;
        }
    }
}
