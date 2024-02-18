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

import * as Shared from '../shared';
import type * as dC from './Client.decl';
import type * as dT from '../transporters';
import { EventEmitter } from 'node:events';
import { AbstractTvChannelV2, encoder } from '../shared/Channel.impl';
import * as v2 from '../shared/Encodings/v2';
import { buffer2json, /* debugLog */ } from '../shared/Utils';

let channelIdCounter = Date.now();

class TvJsonApiClient<TApis extends Shared.IObject> extends EventEmitter implements dC.IClient<TApis> {

    private _channel: TvClientChannel | null = null;

    private _connecting: Promise<TvClientChannel> | null = null;

    public constructor(
        private readonly _connector: dT.IConnector,
        public timeout: number,
        private readonly _streamManagerFactory: Shared.IStreamManagerFactory,
    ) {

        super();
    }

    public get streams(): Shared.IStreamManager {

        const ret = this._channel?.streams;

        if (!ret) {

            throw new Shared.errors.channel_inactive();
        }

        return ret;
    }

    private readonly _onChannelClose = (): void => {

        this._channel?.off('close', this._onChannelClose)
            .off('push_message', this._onMessage);

        this._channel = null;
    };

    private readonly _onMessage = (msg: Buffer[]): void => {

        this.emit('push_message', msg);
    };

    private readonly _onError = (e: unknown): void => {

        this.emit('error', e);
    };

    public get transporter(): Shared.ITransporter  | null {

        return this._channel?.transporter ?? null;
    }

    public get ended(): boolean {

        return false !== this._channel?.ended;
    }

    public get finished(): boolean {

        return false !== this._channel?.finished;
    }

    public get writable(): boolean {

        return false !== this._channel?.writable;
    }

    protected async _getChannel(): Promise<TvClientChannel> {

        if (this._channel?.transporter?.writable) {

            // debugLog('televoke', 'Reusing existing channel.');
            return this._channel;
        }

        if (this._connecting) {

            // debugLog('televoke', 'Waiting for previous connection to be established.');
            return this._connecting;
        }

        try {

            // debugLog('televoke', 'Attempting to connect...');
            return this._channel = await (this._connecting = this._connect());
        }
        catch (e) {

            // debugLog('televoke', 'Attempts to connect failed.');
            this._channel = null;
            this._connecting = null;
            throw e;
        }
        finally {

            // debugLog('televoke', 'Attempts to connect finished.');
            this._connecting = null;
        }
    }

    private async _connect(): Promise<TvClientChannel> {

        this._channel = new TvClientChannel(
            await this._connector.connect() as any,
            this._streamManagerFactory,
            this.timeout
        )
            .on('close', this._onChannelClose)
            .on('error', this._onError)
            .on('push_message', this._onMessage);

        return this._channel;
    }

    public async invoke(
        name: unknown,
        ...args: any[]
    ): Promise<any> {

        try {

            const resp = await (await this._getChannel()).apiCall(name as string, JSON.stringify(args));

            return buffer2json(resp);
        }
        catch (e) {

            if (e instanceof Shared.errors.app_error) {

                let info: unknown;

                try {

                    info = JSON.parse(e.message);
                }
                catch {

                    throw e;
                }

                throw new Shared.TvErrorResponse(info);
            }

            throw e;
        }
    }

    public close(): void {

        this._channel?.close();
        // this._onChannelClose();
    }

    public async ping(msg?: Buffer | string): Promise<Buffer> {

        return (await this._getChannel()).ping(msg);
    }

    public async connect(): Promise<void> {

        await this._getChannel();
    }

    public async sendBinaryChunk(streamId: number, index: number, chunk: Buffer): Promise<void> {

        return (await this._getChannel()).sendBinaryChunk(streamId, index, chunk);
    }
}

class TvClientChannel extends AbstractTvChannelV2 {

    public constructor(
        transporter: dT.ITransporter & Shared.ITransporter,
        streamManagerFactory: Shared.IStreamManagerFactory,
        timeout: number = 60_000,
    ) {

        super(channelIdCounter++, transporter, timeout, streamManagerFactory);
    }

    public apiCall(
        name: string,
        argsBody: Buffer | string | Buffer[],
    ): Promise<Buffer[]> {

        if (!this.writable) {

            return Promise.reject(new Shared.errors.channel_inactive());
        }

        const seq = this._seqCounter++;

        (this.transporter as dT.ITransporter).write(encoder.encode({
            'typ': v2.EPacketType.REQUEST,
            'cmd': v2.ECommand.API_CALL,
            'seq': seq,
            'ct': {
                'name': name,
                'body': typeof argsBody === 'string' ? Buffer.from(argsBody) : argsBody
            }
        } satisfies v2.IApiRequestPacket));

        return new Promise((resolve, reject) => {

            this._setTimeout(v2.ECommand.API_CALL, seq, (resp) => {

                if (resp.ct instanceof Shared.TelevokeError) {

                    reject(resp.ct);
                    return;
                }

                resolve(resp.ct as Buffer[]);
            });
        });
    }
}

/**
 * Create a JSON-RPC client instance, over televoke2 protocol.
 *
 * @param connector             The connector instance.
 * @param streamManagerFactory  The stream manager factory function. [default: createSharedStreamManagerFactory()]
 * @param timeout               The default timeout value of commands, in milliseconds. [default: 60000]
 * @returns                     The client instance.
 */
export function createJsonApiClient<TApis extends Shared.IObject>(
    connector: dT.IConnector,
    streamManagerFactory: Shared.IStreamManagerFactory = Shared.createSharedStreamManagerFactory(),
    timeout: number = 60_000,
): dC.IClient<TApis> {

    return new TvJsonApiClient<TApis>(connector, timeout, streamManagerFactory);
}
