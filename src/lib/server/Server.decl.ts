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

export interface IChannelEvents extends Shared.IDefaultEvents {

    close(): void;
}

export interface IChannel extends Shared.IChannelBase<IChannelEvents> {

    /**
     * The channel id.
     */
    readonly id: number;
}

export interface IRequestContext {

    /**
     * The channel which the request comes from.
     */
    readonly channel: IChannel;
}

export type IRouteApiCallback = (response: string | Buffer | Array<string | Buffer> | Shared.TelevokeError) => void;

export type IRouteLegacyApiCallback = (response: unknown | Shared.TvErrorResponse | Shared.TelevokeError) => void;

export interface IRouter extends Shared.IEventListener<Shared.IDefaultEvents> {

    /**
     * The encoding of the API request/response.
     */
    readonly encoding: string;

    /**
     * Process an API call.
     *
     * @param cb        The callback function of processing result.
     * @param name      The API name.
     * @param args      The API arguments.
     * @param context   The request context.
     */
    processApi(
        cb: IRouteApiCallback,
        name: string,
        args: Buffer[],
        context: IRequestContext
    ): void;

    /**
     * Process an API call from legacy client.
     *
     * @param cb        The callback function of processing result.
     * @param name      The API name.
     * @param args      The API arguments.
     * @param context   The request context.
     */
    processLegacyApi(
        cb: IRouteLegacyApiCallback,
        name: string,
        args: unknown,
        context: IRequestContext
    ): void;
}

export interface IServerEvents extends Shared.IDefaultEvents {

    channel(channel: IChannel): void;

    warning(error: unknown, channel?: IChannel): void;
}

export interface IServer extends Shared.IEventListener<IServerEvents> {

    readonly router: IRouter;

    /**
     * The timeout for waiting replies of each command sent to the remote endpoint, in milliseconds.
     *
     * @default 60000
     */
    timeout: number;

    /**
     * Get the channel object by Id.
     *
     * @param channelId     The channel Id.
     */
    getChannel(channelId: string): IChannel | null;

    /**
     * Get the Id list of all alive channels.
     */
    getChannelIdList(): string[];
}
