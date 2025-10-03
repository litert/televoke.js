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

import type * as CS from './Constants.v2';
import type { TelevokeError } from '../../Errors';

export type IBinLike = Buffer | string;

export type IBinLikeArray = IBinLike[];

export type IDecBinItem = Buffer[];

export type IEncBinItem = IBinLike | IBinLikeArray;

export interface ICommandPacket {

    /**
     * The command of this packet.
     */
    cmd: CS.ECommand;

    /**
     * The type of this packet.
     */
    typ: CS.EPacketType;

    /**
     * The sequence number of this packet.
     */
    seq: number;

    /**
     * The content of this packet.
     */
    ct: unknown;
}

export interface IRequestPacket extends ICommandPacket {

    typ: CS.EPacketType.REQUEST;
}

export interface IErrorReplyPacket extends ICommandPacket {

    typ: CS.EPacketType.ERROR_RESPONSE;

    ct: TelevokeError;
}

export interface IOkReplyPacket extends ICommandPacket {

    typ: CS.EPacketType.SUCCESS_RESPONSE;
}

export interface IApiRequestPacket<TIsReq extends boolean> extends IRequestPacket {

    cmd: CS.ECommand.API_CALL;

    ct: {

        /**
         * The name of the API to be invoked.
         */
        name: string;

        /**
         * The arguments of the API to be invoked.
         */
        body: TIsReq extends true ? IEncBinItem : Buffer[];

        /**
         * The encoding identifier of the body.
         *
         * @default 0 which means JSON
         */
        bodyEnc?: number;

        /**
         * The extension binary chunks of the API to be invoked.
         */
        binChunks?: TIsReq extends true ? IEncBinItem[] : Buffer[][];
    };
}

export type IApiRequestPacketEncoding = IApiRequestPacket<true>;

export type IApiRequestPacketDecoded = IApiRequestPacket<false>;

export interface IApiReplyPacket<TIsReq extends boolean> extends IOkReplyPacket {

    cmd: CS.ECommand.API_CALL;

    ct: {

        body: TIsReq extends true ? IEncBinItem : Buffer[];

        /**
         * The extension binary chunks of the API to be invoked.
         */
        binChunks?: TIsReq extends true ? IEncBinItem[] : Buffer[][];
    };
}

export type IApiReplyPacketEncoding = IApiReplyPacket<true>;

export type IApiReplyPacketDecoded = IApiReplyPacket<false>;

// PING Command

export interface IPingRequestPacket<TIsReq extends boolean> extends IRequestPacket {

    cmd: CS.ECommand.PING;

    ct: TIsReq extends true ? IEncBinItem : IDecBinItem;
}

export type IPingRequestPacketEncoding = IPingRequestPacket<true>;

export type IPingRequestPacketDecoded = IPingRequestPacket<false>;

export interface IPingReplyPacket<TIsReq extends boolean> extends IOkReplyPacket {

    cmd: CS.ECommand.PING;

    ct: TIsReq extends true ? IEncBinItem : Buffer[];
}

export type IPingReplyPacketEncoding = IPingReplyPacket<true>;

export type IPingReplyPacketDecoded = IPingReplyPacket<false>;

// PUSH_MESSAGE Command

export interface IPushMessageRequestPacket<TIsReq extends boolean> extends IRequestPacket {

    cmd: CS.ECommand.PUSH_MESSAGE;

    ct: TIsReq extends true ? IEncBinItem : Buffer[];
}

export type IPushMessageRequestPacketEncoding = IPushMessageRequestPacket<true>;

export type IPushMessageRequestPacketDecoded = IPushMessageRequestPacket<false>;

export interface ICloseRequestPacket extends IRequestPacket {

    cmd: CS.ECommand.CLOSE;

    ct: null;
}

export interface IBinaryChunkRequestPacket<TIsReq extends boolean> extends IRequestPacket {

    cmd: CS.ECommand.BINARY_CHUNK;

    ct: {

        /**
         * The stream ID of this chunk should be sent to.
         */
        streamId: number;

        /**
         * The index of this chunk in the stream.
         */
        index: number;

        /**
         * The chunk data.
         */
        body: TIsReq extends true ? IEncBinItem : Buffer[];
    };
}

export type IBinaryChunkRequestPacketEncoding = IBinaryChunkRequestPacket<true>;

export type IBinaryChunkRequestPacketDecoded = IBinaryChunkRequestPacket<false>;
