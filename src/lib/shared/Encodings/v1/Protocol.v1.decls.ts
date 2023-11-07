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

export enum EResponseCode {

    /**
     * API was called succeed
     */
    OK,
    /**
     * The invoked API does not exist on the remote server.
     */
    API_NOT_FOUND,
    /**
     * Some unexpected error happened.
     */
    SYSTEM_ERROR,
    /**
     * Logical error happened inside the API handler.
     */
    FAILURE,
    /**
     * The arguments inside the request is malformed.
     */
    MALFORMED_ARGUMENTS
}

export interface IRequestPayloadV1 {

    ttl: number;

    api: string;

    args: unknown;

    cst: number;

    rid: string | number;
}

export interface IResponsePayloadV1 {

    /**
     * The time when server sent the response.
     */
    sst: number;

    /**
     * The time when server received the request.
     */
    srt: number;

    /**
     * The identity of the request.
     */
    rid: string | number;

    /**
     * The protocol status code of the response.
     */
    code: number;

    /**
     * The content of API response.
     */
    body: unknown;
}

/**
 * The default port for HTTP.
 */
export const DEFAULT_INSECURE_PORT = 80;

/**
 * The default port for HTTPS.
 */
export const DEFAULT_SECURE_PORT = 443;

export const DEFAULT_BACKLOG = 511;

export const DEFAULT_HOSTNAME = 'localhost';

export const MAX_PACKET_SIZE = 64 * 1024 * 1024;
