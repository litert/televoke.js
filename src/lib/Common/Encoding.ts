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

export const MAX_PACKET_SIZE = 67108864;

export interface IWritable {

    write(buf: Buffer | string, cb?: () => void): void;

    writable: boolean;
}

export interface IEncoder {

    encode(socket: IWritable, content: any): void;
}

export interface IDecoder<T> {

    onProtocolError: (e: unknown) => void;

    onLogicError: (e: unknown) => void;

    onData: (data: T) => void;

    decode(chunk: Buffer): void;

    reset(): void;
}
