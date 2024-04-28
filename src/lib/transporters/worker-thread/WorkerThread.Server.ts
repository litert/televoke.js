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
import type * as dT from '../Transporter.decl';
import * as cWT from './WorkerThread.Constants';
import { EventEmitter } from 'node:events';
import { MainThreadTransporter, WorkerThreadTransporter } from './WorkerThread.Transporter';
import * as eWT from './WorkerThread.Errors';

export interface IMainThreadGateway extends dT.IGateway {

    /**
     * Add a worker thread to the gateway, so that the gateway can communicate with it.
     *
     * > The worker thread must be online already.
     *
     * @param worker    The worker instance on the main thread.
     */
    registerWorker(worker: NodeWorker.Worker): void;
}

const VOID_OK_PROMISE = Promise.resolve();

class MainThreadGateway extends EventEmitter implements IMainThreadGateway {

    public constructor(
        private readonly _server: dT.IServer,
    ) { super(); }

    public get running(): boolean {

        return true;
    }

    public start(): Promise<void> {

        return VOID_OK_PROMISE;
    }

    public stop(): Promise<void> {

        return VOID_OK_PROMISE;
    }

    public registerWorker(worker: NodeWorker.Worker): void {

        if (worker?.threadId === -1) {

            throw new eWT.E_WORKER_THREAD_OFFLINE();
        }

        this._server.registerChannel(new MainThreadTransporter(cWT.MAIN_THREAD_PROTOCOL_NAME, worker));
    }
}

class WorkerThreadGateway extends EventEmitter implements dT.IGateway {

    private _transporter: WorkerThreadTransporter | null = null;

    public constructor(
        private readonly _server: dT.IServer,
    ) { super(); }

    public get running(): boolean {

        return !!this._transporter;
    }

    public start(): Promise<void> {

        if (this._transporter) {

            return VOID_OK_PROMISE;
        }

        this._server.registerChannel(this._transporter = new WorkerThreadTransporter(cWT.WORKER_THREAD_PROTOCOL_NAME));

        return VOID_OK_PROMISE;
    }

    public stop(): Promise<void> {

        this._transporter?.end();
        this._transporter = null;

        return VOID_OK_PROMISE;
    }
}

/**
 * Create a gateway that runs in the main thread.
 *
 * @param server    The server instance.
 * @experimental
 */
export function createMainThreadGateway(server: dT.IServer): IMainThreadGateway {

    if (!NodeWorker.isMainThread) {

        throw new eWT.E_MAIN_THREAD_ONLY();
    }

    return new MainThreadGateway(server);
}

let workerThreadGateway: WorkerThreadGateway | null = null;

/**
 * Create a gateway that runs in the worker thread.
 *
 * @param server    The server instance.
 * @experimental
 */
export function createWorkerThreadGateway(server: dT.IServer): dT.IGateway {

    if (NodeWorker.isMainThread) {

        throw new eWT.E_WORKER_THREAD_ONLY();
    }

    return workerThreadGateway ??= new WorkerThreadGateway(server);
}
