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

import * as LwDFX from '@litert/lwdfx';
import * as Shared from '../../shared';
import type * as dT from '../Transporter.decl';
import { EventEmitter } from 'node:events';

const PROPERTY_NAMES = ['remoteAddress', 'remotePort', 'localAddress', 'localPort'];

export class LwDFXTransporter extends EventEmitter implements dT.ITransporter, Shared.ITransporter {

    public constructor(
        public readonly protocol: string,
        protected readonly _conn: LwDFX.IConnection
    ) {
        super();

        this._conn
            .on('end', () => this.emit('end'))
            .on('finish', () => this.emit('finish'))
            .on('frame', (data) => this.emit('frame', data))
            .on('error', (e) => this.emit('error', e))
            .on('close', () => this.emit('close'));
    }

    public destroy(): void {

        this._conn.destroy();
    }

    public getPropertyNames(): string[] {

        return PROPERTY_NAMES;
    }

    public getAllProperties(): Record<string, unknown> {

        return {
            'remoteAddress': this._conn.remoteAddress,
            'remotePort': this._conn.remotePort,
            'localAddress': this._conn.localAddress,
            'localPort': this._conn.localPort,
        };
    }

    public getProperty(name: string): unknown {

        switch (name) {
            case 'localPort':
            case 'localAddress':
            case 'remotePort':
            case 'remoteAddress':
                return this._conn[name];
            default:
                return undefined;
        }
    }

    public get writable(): boolean {

        return this._conn.connected;
    }

    public write(frame: Array<string | Buffer>): void {

        if (!this._conn.writable) {

            throw new Shared.errors.network_error({ reason: 'conn_lost' });
        }

        this._conn.write(frame);
    }

    public end(): void {

        if (this._conn.writable) {

            this._conn.end();
        }
    }
}
