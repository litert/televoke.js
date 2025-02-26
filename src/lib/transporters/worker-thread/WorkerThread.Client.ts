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

import * as NodeWorker from 'node:worker_threads';
import type * as dT from '../Transporter.decl';
import * as eWT from './WorkerThread.Errors';
import { MAIN_THREAD_PROTOCOL_NAME } from './WorkerThread.Constants';
import { MainThreadTransporter, WorkerThreadTransporter } from './WorkerThread.Transporter';

class MainServerConnector implements dT.IConnector {

    private _transporter: dT.ITransporter | null = null;

    public async connect(): Promise<dT.ITransporter> {

        return Promise.resolve(this._transporter ??= new WorkerThreadTransporter(MAIN_THREAD_PROTOCOL_NAME));
    }
}

class WorkerServerConnector implements dT.IConnector {

    private _worker: NodeWorker.Worker | null = null;

    public constructor(worker: NodeWorker.Worker) {

        this._worker = worker
            .on('exit', () => { this._worker = null; });
    }

    private _transporter: dT.ITransporter | null = null;

    public async connect(): Promise<dT.ITransporter> {

        if (!this._worker) {

            throw new eWT.E_WORKER_THREAD_OFFLINE();
        }

        this._transporter ??= new MainThreadTransporter(MAIN_THREAD_PROTOCOL_NAME, this._worker);

        return Promise.resolve(this._transporter);
    }
}

let inst: MainServerConnector | null = null;

/**
 * Create a connector to connect to the server running in the main thread.
 *
 * @experimental
 */
export function connectToMainThreadServer(): dT.IConnector {

    if (NodeWorker.isMainThread) {

        throw new eWT.E_WORKER_THREAD_ONLY();
    }

    return inst ??= new MainServerConnector();
}

/**
 * Create a connector to connect to the server running in the worker thread.
 *
 * @experimental
 */
export function connectToWorkerThreadServer(worker: NodeWorker.Worker): dT.IConnector {

    if (!NodeWorker.isMainThread) {

        throw new eWT.E_MAIN_THREAD_ONLY();
    }

    return new WorkerServerConnector(worker);
}
