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

import * as NodeWorker from 'node:worker_threads';
import * as Shared from '../../shared';
import type * as dT from '../Transporter.decl';
import * as eWT from './WorkerThread.Errors';
import { EventEmitter } from 'node:events';

const PROPERTY_NAMES = ['remoteAddress', 'remotePort', 'localAddress', 'localPort', 'threadId'];

const MSG_PREFIX = 'televoke2://';

abstract class AbstractThreadTransporter extends EventEmitter {

    public constructor(
        public readonly protocol: string
    ) {

        super();
    }

    public getPropertyNames(): string[] {

        return PROPERTY_NAMES;
    }

    public getAllProperties(): Record<string, unknown> {

        return {
            'remoteAddress': '127.0.0.1',
            'remotePort': 0,
            'localAddress': '127.0.0.1',
            'localPort': 0,
            'threadId': NodeWorker.threadId,
        };
    }

    public getProperty(name: string): unknown {

        switch (name) {
            case 'localPort':
                return 0;
            case 'localAddress':
                return '127.0.0.1';
            case 'remotePort':
                return 0;
            case 'remoteAddress':
                return '127.0.0.1';
            case 'threadId':
                return NodeWorker.threadId;
            default:
                return undefined;
        }
    }

    public abstract destroy(): void;

    public end(): void {

        this.destroy();
    }

    protected _write(
        worker: NodeWorker.MessagePort | NodeWorker.Worker,
        frame: Array<string | Buffer>
    ): void {

        for (let i = 0; i < frame.length; i++) {

            const f = frame[i];

            if (!(f instanceof Buffer)) {

                frame[i] = Buffer.from(f);
            }
        }

        try {

            worker.postMessage(MSG_PREFIX + Buffer.concat(frame as Buffer[]).toString('base64'));
        }
        catch (e) {

            throw new Shared.errors.network_error({ reason: 'conn_lost', cause: e });
        }
    }

    protected _onMessage = (frame: unknown): void => {

        if (typeof frame !== 'string' || !frame.startsWith(MSG_PREFIX)) {

            return;
        }

        this.emit('frame', [Buffer.from(frame.slice(MSG_PREFIX.length), 'base64')]);
    };
}

export class MainThreadTransporter extends AbstractThreadTransporter implements dT.ITransporter, Shared.ITransporter {

    private _closed: boolean = false;

    public constructor(
        protocol: string,
        protected readonly _worker: NodeWorker.Worker
    ) {

        super(protocol);

        this._worker
            .on('message', this._onMessage)
            .on('error', this._onError)
            .on('exit', this._onExit);
    }

    private readonly _onError = (e: unknown): void => { this.emit('error', e); };

    private readonly _onExit = (): void => { this.destroy(); };

    public destroy(): void {

        this._closed = true;

        this._worker.removeListener('message', this._onMessage);
        this._worker.removeListener('error', this._onError);
        this._worker.removeListener('exit', this._onExit);

        this.emit('close');
    }

    public get writable(): boolean {

        return !this._closed;
    }

    public write(frame: Array<string | Buffer>): void {

        if (this._closed) {

            throw new Shared.errors.network_error({ reason: 'conn_lost' });
        }

        this._write(this._worker, frame);
    }
}

export class WorkerThreadTransporter extends AbstractThreadTransporter implements dT.ITransporter, Shared.ITransporter {

    private _hold: NodeJS.Timeout | null = setInterval(() => { return; }, 3600_000);

    public constructor(protocol: string) {

        super(protocol);

        if (NodeWorker.isMainThread) {

            throw new eWT.E_WORKER_THREAD_ONLY();
        }

        NodeWorker.parentPort!.on('message', this._onMessage);
    }

    public destroy(): void {

        if (this._hold) {

            clearInterval(this._hold);
            this._hold = null;

            NodeWorker.parentPort!.removeListener('message', this._onMessage);

            this.emit('close');
        }
    }

    public get writable(): boolean {

        return !!this._hold;
    }

    public write(frame: Array<string | Buffer>): void {

        if (!this._hold) {

            throw new Shared.errors.network_error({ reason: 'conn_lost' });
        }

        super._write(NodeWorker.parentPort!, frame);
    }
}
