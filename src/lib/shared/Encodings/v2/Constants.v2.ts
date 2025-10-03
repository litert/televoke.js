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

export enum ECommand {
    API_CALL = 0x00,
    PUSH_MESSAGE = 0x01,
    BINARY_CHUNK = 0x02,
    PING = 0xFE,
    CLOSE = 0xFF
}

export enum EPacketType {
    REQUEST = 0x00,
    SUCCESS_RESPONSE = 0x01,
    ERROR_RESPONSE = 0x02,
}

export const JSON_API_ARGS_ENCODING = 0x00; // JSON encoding
export const DEFAULT_API_ARGS_ENCODING = JSON_API_ARGS_ENCODING;

export const HEADER_SIZE = 8;

export const API_CALL_REQ_EXT_HEADER_SIZE = 12;
export const API_CALL_RESP_EXT_HEADER_SIZE = 8;

export enum EApiCallReqExtHeaderFieldOffset {

    LENGTH = 0,
    BODY_ENC = 4,
    BIN_CHUNK_QTY = 8
}

export enum EApiCallRespExtHeaderFieldOffset {

    LENGTH = 0,
    BIN_CHUNK_QTY = 4
}
