/**
 * Copyright 2020 Angus.Fenying <fenying@litert.org>
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

import { ErrorHub } from '../Errors';

interface IResponseError {

    api: string;

    requestId: string | number;

    details: any;

    time: number;
}

export const E_OPERATION_ABORTED = ErrorHub.define(
    null,
    'E_OPERATION_ABORTED',
    'The CONNECT/CLOSE operation has been cancelled.',
    {}
);

export const E_CONN_LOST = ErrorHub.define(
    null,
    'E_CONN_LOST',
    'The connection to remote server lost.',
    {}
);

export const E_CONN_CLOSING = ErrorHub.define(
    null,
    'E_CONN_CLOSING',
    'The connection has been shutting down.',
    {}
);

export const E_CONN_NOT_READY = ErrorHub.define(
    null,
    'E_CONN_NOT_READY',
    'The connection is not ready yet.',
    {}
);

export const E_SERVER_INTERNAL_ERROR = ErrorHub.define<IResponseError>(
    null,
    'E_SERVER_INTERNAL_ERROR',
    'Something wrong insides the remote server.',
    {} as any
);

export const E_REQUEST_TIMEOUT = ErrorHub.define<IResponseError>(
    null,
    'E_REQUEST_TIMEOUT',
    'The server does not response in time.',
    {} as any
);

export const E_API_NOT_FOUND = ErrorHub.define<IResponseError>(
    null,
    'E_API_NOT_FOUND',
    'The requested API does not exist.',
    {} as any
);

export const E_SERVER_LOGIC_FAILURE = ErrorHub.define<IResponseError>(
    null,
    'E_SERVER_LOGIC_FAILURE',
    'Failed to handle the request by remote handler.',
    {} as any
);

export const E_SERVER_UNKNOWN_ERROR = ErrorHub.define<IResponseError>(
    null,
    'E_SERVER_UNKNOWN_ERROR',
    'Something unexpected occured.',
    {} as any
);

export const E_INVALID_RESPONSE = ErrorHub.define(
    null,
    'E_INVALID_RESPONSE',
    'The response from remote is invalid.',
    {}
);
