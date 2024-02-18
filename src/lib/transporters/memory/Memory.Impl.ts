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

import * as Shared from '../../shared';
import type * as dT from '../Transporter.decl';
import { EventEmitter } from 'node:events';
import * as Crypto from 'node:crypto';

export interface IGatewayOptions {

    name?: string;

    server: dT.IServer;
}

function createRandomName(): string {

    return Crypto.randomBytes(8).toString('hex');
}

interface IMemoryExchangeEvents extends Shared.IDefaultEvents {

    ['data_a'](data: any): void;

    ['data_b'](data: any): void;

    ['end_a'](): void;

    ['end_b'](): void;

    close(): void;
}

class MemoryExchange extends EventEmitter implements Shared.IEventListener<IMemoryExchangeEvents> {

    private _aEnded: boolean = false;

    private _bEnded: boolean = false;

    public constructor(
        public readonly name: string
    ) {

        super();
    }

    public send(targetEndpoint: 'a' | 'b', data: any): void {

        setImmediate(() => this.emit('data_' + targetEndpoint, data));
    }

    public isEnded(endpoint: 'a' | 'b'): boolean {

        if (endpoint === 'a') {

            return this._aEnded;
        }

        return this._bEnded;
    }

    public end(endpoint: 'a' | 'b'): void {

        if (this._aEnded && this._bEnded) {
            return;
        }

        if (endpoint === 'a') {

            if (this._aEnded) {
                return;
            }

            this._aEnded = true;
            setImmediate(() => this.emit('end_a'));

        }
        else {

            if (this._bEnded) {
                return;
            }

            this._bEnded = true;
            setImmediate(() => this.emit('end_b'));
        }

        if (this._aEnded && this._bEnded) {

            setImmediate(() => this.emit('close'));
        }
    }

    public close(): void {

        this.end('a');
        this.end('b');
    }
}

class MemorySocket extends EventEmitter implements dT.ITransporter, Shared.ITransporter {

    private readonly _targetEndpoint: 'a' | 'b';

    public readonly protocol: string = 'memory';

    public constructor(
        private readonly _exchange: MemoryExchange,
        private readonly _endpoint: 'a' | 'b'
    ) {
        super();
        this._targetEndpoint = _endpoint === 'a' ? 'b' : 'a';

        this._exchange
            .on('end_' + this._targetEndpoint, () => {
                try {
                    this.emit('end');
                }
                catch (e) {
                    this.emit('error', e);
                }
            })
            .on('data_' + this._endpoint, (data) => {
                try {
                    this.emit('frame', data);
                }
                catch (e) {
                    this.emit('error', e);
                }
            })
            .on('error', (e) => this.emit('error', e))
            .on('close', () => this.emit('close'));
    }

    public get writable(): boolean {

        return !this._exchange.isEnded(this._endpoint);
    }

    public getProperty(name: string): unknown {

        switch (name) {
            case 'remoteAddress':   return 'localhost';
            case 'remotePort':      return 0;
            case 'localAddress':    return 'localhost';
            case 'localPort':       return 0;
            default:                return null;
        }
    }

    public getPropertyNames(): string[] {

        return ['remoteAddress', 'remotePort', 'localAddress', 'localPort'];
    }

    public getAllProperties(): Record<string, unknown> {

        return {
            'remoteAddress': 'localhost',
            'remotePort': 0,
            'localAddress': 'localhost',
            'localPort': 0,
        };
    }

    public write(data: string | Buffer | Array<string | Buffer>): void {

        if (this._exchange.isEnded(this._endpoint)) {

            throw new Shared.errors.network_error({ reason: 'conn_lost' });
        }

        if (!Array.isArray(data)) {

            data = [data];
        }

        for (let i = 0; i < data.length; ++i) {

            if (!(data[i] instanceof Buffer)) {

                data[i] = Buffer.from(data[i]);
            }
        }

        this._exchange.send(this._targetEndpoint, data);
    }

    public destroy(): void {

        this._exchange.close();
    }

    public end(lastChunk?: any): void {

        if (lastChunk !== undefined) {

            this.write(lastChunk);
        }

        this._exchange.end(this._endpoint);
    }
}

export interface IMemoryGateway extends dT.IGateway {

    readonly running: boolean;

    readonly name: string;
}

class MemoryGateway extends EventEmitter implements IMemoryGateway {

    private _running: boolean = false;

    private readonly _exchanges: Record<string, MemoryExchange> = {};

    public constructor(
        public readonly name: string,
        private readonly _server: dT.IServer,
        // private readonly _opts: D.IServerOptions
    ) {

        super();
    }

    public get running(): boolean {

        return this._running;
    }

    private _createExchange(): MemoryExchange {

        const ex = new MemoryExchange(this._generateExchangeName());
        return this._exchanges[ex.name] = ex;
    }

    private _generateExchangeName(): string {

        let name: string;

        do {

            name = createRandomName();

        } while (this._exchanges[name]);

        return name;
    }

    public connect(): dT.ITransporter {

        if (!this._running) {

            throw new Shared.errors.network_error({ reason: 'conn_refused' });
        }

        const ex = this._createExchange();

        const serverSocket = new MemorySocket(ex, 'a');
        const clientSocket = new MemorySocket(ex, 'b');

        ex.on('close', () => {

            delete this._exchanges[ex.name];
        });

        this._server.registerChannel(serverSocket);

        return clientSocket;
    }

    public start(): Promise<void> {

        if (!this._running) {

            this._running = true;
            this.emit('listening');
        }

        return Promise.resolve();
    }

    public stop(): Promise<void> {

        if (!this._running) {

            return Promise.resolve();
        }

        for (const ex of Object.values(this._exchanges)) {

            ex.close();
        }

        this.emit('close');

        return Promise.resolve();
    }
}

const servers: Record<string, MemoryGateway> = {};

export function createServer(opts: IGatewayOptions, listener?: (socket: dT.ITransporter) => void): MemoryGateway {

    opts.name ??= createRandomName();

    if (servers[opts.name]) {

        throw new Shared.errors.network_error({ reason: 'dup_listen' });
    }

    const server = new MemoryGateway(opts.name, opts.server);

    servers[opts.name] = server;

    if (listener) {

        server.on('connection', listener);
    }

    server.on('close', () => {

        delete servers[opts.name!];
    });

    return server;
}

class MemoryConnector implements dT.IConnector {

    public constructor(
        private readonly _name: string
    ) {}

    public connect(): Promise<dT.ITransporter> {

        if (!servers[this._name]) {

            throw new Shared.errors.network_error({ reason: 'unknown_dest' });
        }

        return Promise.resolve(servers[this._name].connect());
    }
}

export function createConnector(name: string): dT.IConnector {

    return new MemoryConnector(name);
}
