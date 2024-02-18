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

import * as Shared from './Shared.decl';
import * as Constants from './Constants';
import * as E from './Errors';
import { TvBinaryReadStream } from './BinaryStream';

export class TvBinaryStreamManager implements Shared.IStreamManager {

    private _closed: boolean = false;

    private readonly _streams: Record<string, TvBinaryReadStream> = {};

    public constructor(
        public defaultTimeout: number,
        public maxStreams: number,
    ) { }

    private _generateStreamId(): number {

        do {

            const id = Math.floor(Math.random() * 0xFFFF_FFFF);

            if (id in this._streams) {

                continue;
            }

            return id;

        } while (true);
    }

    public close(): void {

        this._closed = true;

        for (const id of Object.keys(this._streams)) {

            this._streams[id].abort();
            delete this._streams[id];
        }
    }

    public get(id: number): Shared.IBinaryReadStream | null {

        return this._streams[id] ?? null;
    }

    public create(): Shared.IBinaryReadStream {

        if (this.maxStreams === 0) {

            throw new E.errors.cmd_not_impl();
        }
        else if (this._closed) {

            throw new E.errors.stream_closed();
        }
        else if (this.maxStreams >= 0 && Object.keys(this._streams).length === this.maxStreams) {

            throw new E.errors.system_busy();
        }

        const stream = new TvBinaryReadStream(this._generateStreamId(), this.defaultTimeout);

        this._streams[stream.id] = stream.on('close', () => {

            delete this._streams[stream.id];
        });

        return stream;
    }
}

/**
 * Create a factory function to create a `IStreamManager` instance, associated to a single channel.
 * When the associated channel is closed, all streams insides the stream manager will be aborted.
 *
 * @param defaultTimeout    The default timeout value of each new binary stream.
 * @returns                 The factory function.
 */
export function createChannelStreamManagerFactory(
    defaultTimeout: number = Constants.DEFAULT_STREAM_TIMEOUT,
    maxStreams: number = Constants.DEFAULT_MAX_STREAMS,
): Shared.IStreamManagerFactory {

    return (ch) => {

        const ret = new TvBinaryStreamManager(defaultTimeout, maxStreams);

        ch.on('close', () => { ret.close(); });

        return ret;
    };
}

/**
 * Create a factory function to create a `IStreamManager` instance, shared between all channels.
 * So that the streams created could be used in different channels.
 *
 * @param defaultTimeout    The default timeout value of each new binary stream.
 * @returns                 The factory function.
 */
export function createSharedStreamManagerFactory(
    defaultTimeout: number = Constants.DEFAULT_STREAM_TIMEOUT,
    maxStreams: number = Constants.DEFAULT_MAX_STREAMS,
): Shared.IStreamManagerFactory {

    const ret = new TvBinaryStreamManager(defaultTimeout, maxStreams);

    return () => ret;
}

/**
 * Create a factory function to create a `IStreamManager` instance, disabling all binary streams.
 *
 * > This is useful when you don't need binary streams.
 *
 * @returns                 The factory function.
 */
export function createDisabledStreamManagerFactory(): Shared.IStreamManagerFactory {

    const mgr = new TvBinaryStreamManager(0, 0);

    return () => mgr;
}
