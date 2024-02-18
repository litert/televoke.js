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
import * as E from './Errors';
import type * as dT from '../transporters/Transporter.decl';
import { EventEmitter } from 'node:events';
import * as v2 from './Encodings/v2';
import { once } from './Utils';

export interface IChannelEvents extends Shared.IDefaultEvents {

    close(): void;

    ['api_call'](
        callback: (response: v2.IDataChunkField | E.TelevokeError | E.TvErrorResponse) => void,
        name: string,
        args: Buffer[],
        sequence: number,
    ): void;

    ['push_message'](
        message: Buffer[],
        sequence: number,
    ): void;

    end(): void;

    finish(): void;

    warning(e: unknown): void;
}

const DEFAULT_PING_MESSAGE = Buffer.from('PING');

export const decoder = new v2.TvDecoderV2();
export const encoder = new v2.TvEncoderV2();

export interface IPendingRequests {

    cmd: v2.ECommand;

    seq: number;

    timer?: NodeJS.Timeout;

    callback: (cmd: v2.ICommandPacket) => void;
}

enum EState {
    ACTIVE,
    ENDING,
    ENDED,
}

export abstract class AbstractTvChannelV2
    extends EventEmitter
    implements Shared.IChannelBase<IChannelEvents> {

    protected _seqCounter = 0;

    public readonly context: Record<string, unknown> = {};

    /**
     * The context of requests sent out, waiting for replies.
     */
    protected _sentRequests: Record<string, IPendingRequests> = {};

    /**
     * The qty of received and not responded requests, waiting for replies.
     */
    protected _recvRequests: number = 0;

    private _state: EState = EState.ACTIVE;

    public ended: boolean = false;

    public get finished(): boolean {

        return this._state === EState.ENDED;
    }

    public get writable(): boolean {

        return this._state === EState.ACTIVE && this.transporter.writable;
    }

    public readonly streams: Shared.IStreamManager;

    public constructor(
        public readonly id: number,
        public readonly transporter: dT.ITransporter & Shared.ITransporter,
        public timeout: number,
        streamManagerFactory: Shared.IStreamManagerFactory
    ) {

        super();

        this.streams = streamManagerFactory(this as any);

        this._setup();
    }

    private readonly _onData = (frameChunks: Buffer[]): void => {

        try {

            const packet = decoder.decode(frameChunks);

            switch (packet.typ) {
                case v2.EPacketType.REQUEST:
                    this._onRequest(packet);
                    break;
                case v2.EPacketType.ERROR_RESPONSE:
                case v2.EPacketType.SUCCESS_RESPONSE:

                    this._onResponse(packet);
                    break;
                default:
                    this.emit('error', new E.errors.invalid_packet({
                        reason: 'invalid_packet_type',
                        packet,
                    }));
            }
        }
        catch (e) {

            this._end();

            this.emit('error', e);
        }
    };

    private readonly _onConnError = (e: unknown): void => {

        this.emit('error', e);
    };

    private readonly _onConnClose = (): void => {

        for (const k of Object.keys(this._sentRequests)) {

            const req = this._sentRequests[k];
            delete this._sentRequests[k];

            if (req.timer) {

                clearTimeout(req.timer);
            }

            try {

                req.callback({
                    'cmd': req.cmd,
                    'typ': v2.EPacketType.ERROR_RESPONSE,
                    'seq': req.seq,
                    'ct': new E.errors.channel_closed(),
                });
            }
            catch (e) {

                this.emit('warning', e);
            }
        }

        this.ended = true;
        this._state = EState.ENDED;
        this.emit('close');
    };

    private readonly _onRemoteEnded = (): void => {

        if (this.ended) { return; }

        this.ended = true;
        this._state = EState.ENDING;

        this.emit('end');
    };

    private readonly _onLocalEnded = (): void => {

        if (this._state === EState.ENDED) { return; }

        this._state = EState.ENDED;
        this.emit('finish');
    };

    private _setup(): void {

        this.transporter
            .on('frame', this._onData)
            .on('error', this._onConnError)
            .on('close', this._onConnClose)
            .on('end', this._onRemoteEnded)
            .on('finish', this._onLocalEnded);
    }

    private _end(): void {

        // for (const id of Object.keys(this._streams)) {

        //     this._streams[id].abort();
        //     delete this._streams[id];
        // }

        if (this._isIdle()) {

            this._state = EState.ENDED;

            this.transporter.end();
        }
        else {

            this._state = EState.ENDING;
        }
    }

    private _tryClean(): void {

        if (this._state !== EState.ENDING) {

            return;
        }

        if (this._isIdle()) {

            this._state = EState.ENDED;

            this.transporter.end();
        }
    }

    private _isIdle(): boolean {

        return Object.keys(this._sentRequests).length === 0 && this._recvRequests === 0;
    }

    private _onResponse(packet: v2.ICommandPacket): void {

        const request = this._sentRequests[packet.seq];

        if (!request) {

            // Timeout response, drop it.
            return;
        }

        delete this._sentRequests[request.seq];

        if (request.timer !== undefined) {

            clearTimeout(request.timer);
        }

        if (request.cmd !== packet.cmd) {

            request.callback({
                typ: v2.EPacketType.ERROR_RESPONSE,
                seq: request.seq,
                cmd: request.cmd,
                ct: new E.errors.invalid_response({
                    reason: 'mismatched_command',
                    packet,
                })
            });

            this._end();

            return;
        }

        request.callback(packet);
    }

    private _reply(packet: v2.ICommandPacket): void {

        try {

            this.transporter.write(encoder.encode(packet));
        }
        catch (e) {

            // ignore errors here.
            this.emit('warning', e);
        }
    }

    private _onRequest(packet: v2.ICommandPacket): void {

        if (this._state !== EState.ACTIVE) {

            this._reply({
                'cmd': packet.cmd,
                'typ': v2.EPacketType.ERROR_RESPONSE,
                'seq': packet.seq,
                'ct': new E.errors.channel_inactive()
            });
            return;
        }

        switch (packet.cmd) {

            default:

                this._reply({
                    'cmd': packet.cmd,
                    'typ': v2.EPacketType.ERROR_RESPONSE,
                    'seq': packet.seq,
                    'ct': new E.errors.invalid_packet({
                        reason: 'unknown_command',
                        packet,
                    })
                });
                return;

            case v2.ECommand.CLOSE:

                this.on('finish', () => {

                    this._reply({
                        'cmd': v2.ECommand.CLOSE,
                        'typ': v2.EPacketType.SUCCESS_RESPONSE,
                        'seq': packet.seq,
                        'ct': new E.errors.invalid_packet({
                            reason: 'unknown_command',
                            packet,
                        })
                    });
                });

                this._end();
                return;

            case v2.ECommand.PING:

                this._reply({
                    'cmd': v2.ECommand.PING,
                    'typ': v2.EPacketType.SUCCESS_RESPONSE,
                    'seq': packet.seq,
                    'ct': packet.ct,
                });

                this.emit('ping');

                return;

            case v2.ECommand.PUSH_MESSAGE:

                if (!this.listenerCount('push_message')) {

                    this._reply({
                        'cmd': v2.ECommand.PUSH_MESSAGE,
                        'typ': v2.EPacketType.ERROR_RESPONSE,
                        'seq': packet.seq,
                        'ct': new E.errors.cmd_not_impl()
                    });
                    break;
                }

                this._reply({
                    'cmd': v2.ECommand.PUSH_MESSAGE,
                    'typ': v2.EPacketType.SUCCESS_RESPONSE,
                    'seq': packet.seq,
                    'ct': null,
                });

                this.emit('push_message', packet.ct as Buffer[], packet.seq);

                break;

            case v2.ECommand.API_CALL:

                if (!this.listenerCount('api_call')) {

                    this._reply({
                        'cmd': v2.ECommand.API_CALL,
                        'typ': v2.EPacketType.ERROR_RESPONSE,
                        'seq': packet.seq,
                        'ct': new E.errors.cmd_not_impl()
                    });
                    break;
                }

                this._recvRequests++;

                this.emit(
                    'api_call',
                    once((response: v2.IDataChunkField | E.TelevokeError) => {

                        this._recvRequests--;

                        this._reply({
                            'cmd': v2.ECommand.API_CALL,
                            'typ': response instanceof E.TelevokeError ?
                                v2.EPacketType.ERROR_RESPONSE :
                                v2.EPacketType.SUCCESS_RESPONSE,
                            'seq': packet.seq,
                            'ct': response,
                        });
                        this._tryClean();
                    }),
                    (packet as v2.IApiRequestPacket).ct.name,
                    (packet as v2.IApiRequestPacket).ct.body,
                    packet.seq
                );

                break;

            case v2.ECommand.BINARY_CHUNK: {

                const stream = this.streams.get((packet as v2.IBinaryChunkRequestPacket).ct.streamId)!;

                if (!stream) {

                    this._reply({
                        'cmd': v2.ECommand.BINARY_CHUNK,
                        'typ': v2.EPacketType.ERROR_RESPONSE,
                        'seq': packet.seq,
                        'ct': new E.errors.stream_not_found({
                            'sid': (packet as v2.IBinaryChunkRequestPacket).ct.streamId,
                            'chId': this.id,
                        }),
                    });
                    break;
                }

                const chunkSegments = (packet as v2.IBinaryChunkRequestPacket).ct.body as Buffer[];

                const chunkIndex = (packet as v2.IBinaryChunkRequestPacket).ct.index;

                if (chunkIndex === 0xFFFFFFFF) {

                    stream.abort();
                }
                else if (chunkIndex !== stream.nextIndex) {

                    this._reply({
                        'cmd': v2.ECommand.BINARY_CHUNK,
                        'typ': v2.EPacketType.ERROR_RESPONSE,
                        'seq': packet.seq,
                        'ct': new E.errors.stream_index_mismatch({
                            'sid': (packet as v2.IBinaryChunkRequestPacket).ct.streamId,
                            'chId': this.id,
                        }),
                    });
                    break;
                }
                else if (!chunkSegments[0]?.byteLength) {

                    stream.close();
                }
                else {

                    stream.append(chunkSegments);
                }

                this._reply({
                    'cmd': v2.ECommand.BINARY_CHUNK,
                    'typ': v2.EPacketType.SUCCESS_RESPONSE,
                    'seq': packet.seq,
                    'ct': null,
                });

                break;
            }
        }
    }

    protected _setTimeout(cmd: v2.ECommand, seq: number, callback: (packet: v2.ICommandPacket) => any): void {

        const req: IPendingRequests = this._sentRequests[seq] = {
            'cmd': cmd,
            'seq': seq,
            'callback': callback,
        };

        if (this.timeout < 1 || !req) {

            return;
        }

        req.timer = setTimeout(() => {

            if (!req.timer) {

                return;
            }

            delete this._sentRequests[req.seq];

            req.callback({
                'cmd': req.cmd,
                'typ': v2.EPacketType.ERROR_RESPONSE,
                'seq': req.seq,
                'ct': new E.errors.timeout(),
            });
        }, this.timeout);
    }

    public openBinaryStream(): Shared.IBinaryReadStream {

        if (!this.writable || !this.streams) {

            throw new E.errors.channel_inactive();
        }

        return this.streams.create();
    }

    public ping(message?: Buffer | string): Promise<Buffer> {

        if (!this.writable) {

            return Promise.reject(new E.errors.channel_inactive());
        }

        message ??= DEFAULT_PING_MESSAGE;

        const seq = this._seqCounter++;

        this.transporter.write(encoder.encode({
            'cmd': v2.ECommand.PING,
            'typ': v2.EPacketType.REQUEST,
            'seq': seq,
            'ct': message,
        } satisfies v2.IPingRequestPacket));

        return new Promise((resolve, reject) => {

            this._setTimeout(v2.ECommand.PING, seq, (p) => {

                if (p.typ === v2.EPacketType.SUCCESS_RESPONSE) {

                    if (Array.isArray(p.ct)) {

                        resolve(Buffer.concat(p.ct as Buffer[]));
                    }
                    else {

                        resolve(p.ct as Buffer);
                    }
                }
                else {

                    reject(p.ct);
                }
            });
        });
    }

    public sendBinaryChunk(streamId: number, index: number | false, chunk: Buffer | null): Promise<void> {

        if (!this.writable) {

            return Promise.reject(new E.errors.channel_inactive());
        }

        const seq = this._seqCounter++;

        this.transporter.write(encoder.encode({
            'cmd': v2.ECommand.BINARY_CHUNK,
            'typ': v2.EPacketType.REQUEST,
            'seq': seq,
            'ct': {
                streamId,
                'index': index === false ? 0xFFFFFFFF : index,
                'body': chunk ?? [],
            }
        } satisfies v2.IBinaryChunkRequestPacket));

        return new Promise((resolve, reject) => {

            this._setTimeout(v2.ECommand.BINARY_CHUNK, seq, (p) => {

                if (p.typ === v2.EPacketType.SUCCESS_RESPONSE) {

                    resolve();
                }
                else {

                    reject(p.ct);
                }
            });
        });
    }

    public sendMessage(message: string | Buffer): Promise<void> {

        if (!this.writable) {

            return Promise.reject(new E.errors.channel_inactive());
        }

        const seq = this._seqCounter++;

        this.transporter.write(encoder.encode({
            'cmd': v2.ECommand.PUSH_MESSAGE,
            'typ': v2.EPacketType.REQUEST,
            'seq': seq,
            'ct': message,
        } satisfies v2.IPushMessageRequestPacket));

        return new Promise((resolve, reject) => {

            this._setTimeout(v2.ECommand.PUSH_MESSAGE, seq, (p) => {

                if (p.typ === v2.EPacketType.SUCCESS_RESPONSE) {

                    resolve();
                }
                else {

                    reject(p.ct);
                }
            });
        });
    }

    public close(): void {

        if (!this.writable) {

            return;
        }

        const seq = this._seqCounter++;

        try {

            this.transporter.write(encoder.encode({
                'cmd': v2.ECommand.CLOSE,
                'typ': v2.EPacketType.REQUEST,
                'seq': seq,
                'ct': null,
            } satisfies v2.ICloseRequestPacket));
        }
        catch {

            // ignore errors here.
        }

        this._end();
    }
}
