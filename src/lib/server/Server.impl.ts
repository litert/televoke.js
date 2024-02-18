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

import type * as dS from './Server.decl';
import * as Shared from '../shared';
import type * as dT from '../transporters/Transporter.decl';
import { EventEmitter } from 'node:events';
import { IChannelEvents } from '../shared/Channel.impl';
import { TvServerChannelV2 } from './ServerChannel';
import { TvLegacyServerChannelV1 } from './LegacyServerChannel.impl';

let nextChId = Date.now();

export class TvServer extends EventEmitter implements dS.IServer, dT.IServer {

    private readonly _channels: Record<string, dS.IChannel> = {};

    public timeout = 60_000;

    public constructor(
        public router: dS.IRouter,
        private readonly _streamManagerFactory: Shared.IStreamManagerFactory = Shared.createSharedStreamManagerFactory()
    ) {
        super();
        this.router.on('error', this._onRouterError);
    }

    private readonly _onRouterError = (e: unknown): void => {

        this.emit('error', e);
    };

    public setRouter(router: dS.IRouter): void {

        this.router?.off('error', this._onRouterError);
        this.router = router
            .on('error', this._onRouterError);
    }

    public registerChannel(transporter: dT.ITransporter): void {

        const id = nextChId++;

        this._channels[id] = new TvServerChannelV2(
            id,
            transporter as any,
            this.timeout,
            this._streamManagerFactory
        );

        (this._channels[id] as Shared.IChannelBase<IChannelEvents>)
            .on('api_call', (cb, name, body) => {
                this.router.processApi(cb, name, body, {
                    channel: this._channels[id],
                });
            })
            .on('error', (err) => this.emit('error', err))
            .on('warning', (err) => this.emit('warning', err, this._channels[id]))
            .on('close', () => { delete this._channels[id]; });
    }

    public processLegacyApi(
        callback: dT.ILegacyApiResponseCallback,
        name: string,
        args: unknown,
        transporter: Shared.ITransporter
    ): void {

        this.router.processLegacyApi(
            callback,
            name,
            args,
            { 'channel': new TvLegacyServerChannelV1(transporter) }
        );
    }

    public getChannel(id: string): dS.IChannel | null {

        return this._channels[id] ?? null;
    }

    public getChannelIdList(): string[] {

        return Object.keys(this._channels);
    }
}
