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

import * as Shared from '../shared';
import { EventEmitter } from 'node:events';
import * as v2 from '../shared/Encodings/v2';

export type ILegacyApiResponseCallback = (body: v2.IDataChunkField | Shared.TelevokeError) => void;

const streamManager = Shared.createDisabledStreamManagerFactory()(null as any);

export class TvLegacyServerChannelV1 extends EventEmitter implements Shared.IChannelBase<Shared.IDefaultEvents> {

    public get context(): Record<string, unknown> { return {}; }

    public get ended(): boolean { return false; }

    public get finished(): boolean { return false; }

    public get writable(): boolean { return false; }

    public get isMessageSupported(): boolean { return false; }

    public get isBinaryStreamSupported(): boolean { return false; }

    public get id(): number { return 0; }

    public get timeout(): number { return 30_000; }

    public get streams(): Shared.IStreamManager { return streamManager; }

    public constructor(
        public readonly transporter: Shared.ITransporter
    ) {
        super();
    }

    public openBinaryStream(): Shared.IBinaryReadStream {

        throw new Shared.errors.cmd_not_impl();
    }

    public ping(): Promise<Buffer> {

        return Promise.reject(new Shared.errors.cmd_not_impl());
    }

    public sendBinaryChunk(): Promise<void> {

        return Promise.reject(new Shared.errors.cmd_not_impl());
    }

    public sendMessage(): Promise<void> {

        return Promise.reject(new Shared.errors.cmd_not_impl());
    }

    public close(): void {

        return;
    }
}
