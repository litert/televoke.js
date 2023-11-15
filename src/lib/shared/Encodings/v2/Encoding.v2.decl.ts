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

import type * as CS from './Constants.v2';
import type { TelevokeError } from '../../Errors';

export type IDataChunkArray = Array<string | Buffer>;

export type IDataChunkField = string | Buffer | IDataChunkArray;

export interface ICommandPacket {

    /**
     * The command of this packet.
     */
    readonly cmd: CS.ECommand;

    /**
     * The type of this packet.
     */
    readonly typ: CS.EPacketType;

    /**
     * The sequence number of this packet.
     */
    readonly seq: number;

    /**
     * The content of this packet.
     */
    readonly ct: unknown;
}

export interface IRequestPacket extends ICommandPacket {

    readonly typ: CS.EPacketType.REQUEST;
}

export interface IErrorResponsePacket extends ICommandPacket {

    readonly typ: CS.EPacketType.ERROR_RESPONSE;

    readonly ct: TelevokeError;
}

export interface ISuccessResponsePacket extends ICommandPacket {

    readonly typ: CS.EPacketType.SUCCESS_RESPONSE;
}

export interface IApiRequestPacket extends IRequestPacket {

    readonly cmd: CS.ECommand.API_CALL;

    readonly ct: {

        /**
         * The name of the API to be invoked.
         */
        readonly name: string;

        /**
         * The arguments of the API to be invoked.
         */
        readonly body: IDataChunkField;
    };
}

export interface IPingRequestPacket extends IRequestPacket {

    readonly cmd: CS.ECommand.PING;

    readonly ct: IDataChunkField;
}

export interface IPushMessageRequestPacket extends IRequestPacket {

    readonly cmd: CS.ECommand.PUSH_MESSAGE;

    readonly ct: IDataChunkField;
}

export interface ICloseRequestPacket extends IRequestPacket {

    readonly cmd: CS.ECommand.CLOSE;

    readonly ct: null;
}

export interface IBinaryChunkRequestPacket extends IRequestPacket {

    readonly cmd: CS.ECommand.BINARY_CHUNK;

    readonly ct: {

        /**
         * The stream ID of this chunk should be sent to.
         */
        readonly streamId: number;

        /**
         * The index of this chunk in the stream.
         */
        readonly index: number;

        /**
         * The chunk data.
         */
        readonly body: IDataChunkField;
    };
}

export interface IApiResponsePacket extends ISuccessResponsePacket {

    readonly cmd: CS.ECommand.API_CALL;

    readonly ct: IDataChunkField;
}

export interface IPingResponsePacket extends ISuccessResponsePacket {

    readonly cmd: CS.ECommand.PING;

    readonly ct: IDataChunkField;
}
