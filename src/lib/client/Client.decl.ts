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

import type * as Shared from '../shared';

export interface IChannelEvents extends Shared.IDefaultEvents {

    close(): void;

    ['push_message'](msg: Buffer[]): void;
}

export interface IClient<TApis extends Shared.IObject>
    extends Shared.IEventListener<IChannelEvents>, Pick<
        Shared.IChannelBase<IChannelEvents>,
        'close' | 'sendBinaryChunk' | 'finished' | 'ended' | 'ping' | 'writable' | 'streams'
    > {

    /**
     * The timeout for waiting replies of each command sent to the remote endpoint, in milliseconds.
     *
     * @default 60000
     */
    timeout: number;

    /**
     * The transporter object is used to send and receive data to and from the remote endpoint.
     *
     * > Should be `null` when disconnected.
     */
    readonly transporter: Shared.ITransporter | null;

    /**
     * Connect to the remote endpoint.
     */
    connect(): Promise<void>;

    /**
     * Invoke an API.
     *
     * @param name  The API name.
     * @param args  The arguments.
     */
    invoke<TName extends keyof TApis>(
        name: Shared.IfIsFn<TApis[TName], TName>,
        ...args: TApis[TName] extends Shared.IFn<infer TArgs, any> ? TArgs : never
    ): Promise<TApis[TName] extends Shared.IFn<any[], infer TRet> ? TRet : never>;
}
