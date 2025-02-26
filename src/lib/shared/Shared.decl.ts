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

import { Readable } from 'node:stream';

export type IFn<TArgs extends any[], TRet> = (...args: TArgs) => TRet;

export type IVoidFn<TArgs extends any[]> = IFn<TArgs, void>;

// eslint-disable-next-line @typescript-eslint/no-restricted-types, @typescript-eslint/consistent-type-definitions
export type IObject = {};

export type IfIsFn<T, TTrue = T, TFalse = never> = T extends IFn<any[], any> ? TTrue : TFalse;

export type IfIsOfFn<T, TFn extends IFn<any[], any>, TTrue = T, TFalse = never> = T extends TFn ? TTrue : TFalse;

export interface IEventListener<T extends IDefaultEvents> {

    /**
     * Register a listener for the given event.
     *
     * > Alias for `addListener()`.
     *
     * @param event         The event name.
     * @param listener      The listener function.
     */
    on<TKey extends keyof T>(event: TKey, listener: IfIsOfFn<T[TKey], IVoidFn<any[]>>): this;

    /**
     * Register a listener for the given event.
     *
     * > Alias for `addListener()`.
     *
     * @param event         The event name.
     * @param listener      The listener function.
     */
    on(event: string | symbol, listener: IVoidFn<any[]>): this;

    /**
     * Register a one-time listener for the given event.
     *
     * > The listener is invoked only the next time the event is fired, after which it is removed.
     *
     * @param event         The event name.
     * @param listener      The listener function.
     */
    once<TKey extends keyof T>(event: TKey, listener: IfIsOfFn<T[TKey], IVoidFn<any[]>>): this;

    /**
     * Register a one-time listener for the given event.
     *
     * > The listener is invoked only the next time the event is fired, after which it is removed.
     *
     * @param event         The event name.
     * @param listener      The listener function.
     */
    once(event: string | symbol, listener: IVoidFn<any[]>): this;

    /**
     * Register a listener for the given event.
     *
     * > Alias for `on()`.
     *
     * @param event         The event name.
     * @param listener      The listener function.
     */
    addListener<TKey extends keyof T>(event: TKey, listener: IfIsOfFn<T[TKey], IVoidFn<any[]>>): this;

    /**
     * Register a listener for the given event.
     *
     * > Alias for `on()`.
     *
     * @param event         The event name.
     * @param listener      The listener function.
     */
    addListener(event: string | symbol, listener: IVoidFn<any[]>): this;

    /**
     * Remove the given listener for the given event.
     *
     * > Alias for `off()`.
     *
     * @param event     The event name.
     * @param listener  The listener function.
     */
    removeListener<TKey extends keyof T>(event: TKey, listener: IVoidFn<any[]>): this;

    /**
     * Remove the given listener for the given event.
     *
     * > Alias for `off()`.
     *
     * @param event     The event name.
     * @param listener  The listener function.
     */
    removeListener(event: string | symbol, listener: IVoidFn<any[]>): this;

    /**
     * Remove the given listener for the given event.
     *
     * > Alias for `removeListener()`.
     *
     * @param event     The event name.
     * @param listener  The listener function.
     */
    off<TKey extends keyof T>(event: TKey, listener: IVoidFn<any[]>): this;

    /**
     * Remove the given listener for the given event.
     *
     * > Alias for `removeListener()`.
     *
     * @param event     The event name.
     * @param listener  The listener function.
     */
    off(event: string | symbol, listener: IVoidFn<any[]>): this;

    /**
     * Remove all listeners for the given event.
     *
     * @param event     The event name.
     */
    removeAllListeners(event: keyof T): this;

    /**
     * Remove all listeners for the given event.
     *
     * @param event     The event name.
     */
    removeAllListeners(event: string): this;

    /**
     * Return the number of listeners for the given event.
     *
     * @param event     The event name.
     */
    listenerCount(event: keyof T): number;

    /**
     * Return the number of listeners for the given event.
     *
     * @param event     The event name.
     */
    listenerCount(event: string): number;

    /**
     * Set the maximum number of listeners for the given event.
     *
     * @param n     The new value of maximum listeners number.
     */
    setMaxListeners(n: number): this;
}

export interface IDefaultEvents {

    error(error: unknown): void;
}

export interface ITransporter {

    /**
     * The transporting protocol.
     */
    readonly protocol: string;

    readonly writable: boolean;

    /**
     * Get the names of all properties that are available on the transporter.
     */
    getPropertyNames(): readonly string[];

    /**
     * Get the value of a property.
     *
     * @param name The name of the property to get.
     */
    getProperty(name: string): unknown;

    /**
     * Get the values collection of all properties.
     */
    getAllProperties(): Record<string, unknown>;
}

export interface IBinaryReadStream extends Omit<Readable, 'push'> {

    /**
     * The unique id of binary stream.
     */
    readonly id: number;

    /**
     * The expected index of next chunk to read.
     */
    readonly nextIndex: number;

    /**
     * Append a binary data chunk to this binary stream, with the given index.
     *
     * @param chunk     The binary data chunk to be appended.
     * @param index     The index of the chunk in the stream.
     *
     * @returns Whether the chunk is appended successfully.
     */
    append(chunk: Buffer[]): void;

    /**
     * Abort the binary stream before it's completed, and release the resource.
     *
     * > The `readableAborted` property will be set to `true` after calling this method.
     *
     * > A `stream_aborted` error will be emitted in event `error`.
     *
     * > **Note:** The binary stream will be closed immediately after calling this method,
     * > whatever the stream is finished or not.
     */
    abort(): void;

    /**
     * Close the binary stream since it is completed, and release the resource.
     *
     * > **Note:** The binary stream will be closed immediately after calling this method,
     * > whatever the stream is finished or not.
     */
    close(): void;

    /**
     * Set the timeout value of each chunk of this binary stream.
     *
     * > When the timeout is reached, the binary stream will be aborted and a `timeout` error will be emitted in event `error`.
     *
     * > Set to 0 to disable timeout.
     *
     * @param timeout  The timeout value in milliseconds.
     */
    setTimeout(timeout: number): void;
}

export interface IStreamManager {

    /**
     * The default initial timeout value of each new binary stream.
     *
     * > Set to 0 to disable timeout.
     *
     * @type uint
     */
    defaultTimeout: number;

    /**
     * The maximum number of binary streams that can be opened at the same time.
     *
     * > Set to -1 to disable the limit.
     * > Set to 0 to disable opening any new binary streams.
     *
     * @type int
     * @default 10
     */
    maxStreams: number;

    /**
     * Open a binary `Readable` stream on this side, to accept the binary data chunks from the remote side.
     *
     * There is an `id` in the binary stream, which is used to identify the stream. The remote side could use it to invoke
     * `sendBinaryChunk()` method to send the binary data chunks to this side.
     */
    create(): IBinaryReadStream;

    /**
     * Get the binary stream by stream id.
     *
     * @param id    The `id` field in `IBinaryReadStream`.
     */
    get(id: number): IBinaryReadStream | null;

    /**
     * Close all binary streams in this manager, and destroy the manager.
     */
    close(): void;
}

export type IStreamManagerFactory = (channel: IChannelBase<any>) => IStreamManager;

export interface IChannelBase<TEvents extends IDefaultEvents> extends IEventListener<TEvents> {

    /**
     * The transporter object is used to send and receive data to and from the remote endpoint.
     */
    readonly transporter: ITransporter;

    /**
     * Whether this channel supports server-push messages or not.
     */
    readonly isMessageSupported: boolean;

    /**
     * Whether this channel supports binary streams or not.
     */
    readonly isBinaryStreamSupported: boolean;

    /**
     * Tells whether this channel is closed on the local side or not.
     */
    readonly finished: boolean;

    /**
     * Tells whether the channel is closed on the remote side or not.
     */
    readonly ended: boolean;

    /**
     * Whether this channel is writable.
     */
    readonly writable: boolean;

    /**
     * The stream manager of the binary streams.
     */
    readonly streams: IStreamManager;

    /**
     * The context object is used to store data that is shared on the channel.
     *
     * > **Note:** The context object is only available for the lifetime of the channel.
     */
    readonly context: Record<string, any>;

    /**
     * Send a PING command to the remote endpoint.
     *
     * @param msg   The message to send.
     */
    ping(msg?: Buffer | string): Promise<Buffer>;

    /**
     * Send a PUSH_MESSAGE command to the remote endpoint.
     *
     * @param msg   The message to send.
     */
    sendMessage(msg: Buffer | string): Promise<void>;

    /**
     * Send a binary data chunk to an opened binary stream on the remote side.
     *
     * > **NOTE**
     * > - It is not recommended to send a large binary data chunk at once. A large binary chunk should be split
     * >   into several small chunks, and then send them one by one, in order.
     * > - Set the `index` to `false` to close the binary stream by aborting.
     * > - Set the `chunk` to `null` to close the binary stream by finishing.
     *
     * @param id        The `id` field in `IBinaryReadStream`, opened by remote side.
     * @param index     The index of this chunk in the stream.
     * @param chunks    The binary data chunks to be sent.
     */
    sendBinaryChunk(id: number, index: number | false, chunk: Buffer | null): Promise<void>;

    /**
     * Close the channel.
     */
    close(): void | Promise<void>;
}
