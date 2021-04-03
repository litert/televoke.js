/**
 * Copyright 2021 Angus.Fenying <fenying@litert.org>
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

import { errorRegistry } from '../Errors';

export const E_OPERATION_ABORTED = errorRegistry.register({
    name: 'operation_aborted',
    message: 'The CONNECT/CLOSE operation has been cancelled.',
    metadata: {},
    type: 'public'
});

export const E_CONN_LOST = errorRegistry.register({
    name: 'conn_lost',
    message: 'The connection to remote server lost.',
    metadata: {},
    type: 'public'
});

export const E_CONN_CLOSING = errorRegistry.register({
    name: 'conn_closing',
    message: 'The connection has been shutting down.',
    metadata: {},
    type: 'public'
});

export const E_CONN_NOT_READY = errorRegistry.register({
    name: 'conn_not_ready',
    message: 'The connection is not ready yet.',
    metadata: {},
    type: 'public'
});

export const E_SERVER_INTERNAL_ERROR = errorRegistry.register({
    name: 'server_internal_error',
    message: 'Something wrong insides the remote server.',
    metadata: {},
    type: 'public'
});

export const E_REQUEST_TIMEOUT = errorRegistry.register({
    name: 'request_timeout',
    message: 'The server does not response in time.',
    metadata: {},
    type: 'public'
});

export const E_API_NOT_FOUND = errorRegistry.register({
    name: 'api_not_found',
    message: 'The requested API does not exist.',
    metadata: {},
    type: 'public'
});

export const E_SERVER_LOGIC_FAILURE = errorRegistry.register({
    name: 'server_logic_failure',
    message: 'Failed to handle the request by remote handler.',
    metadata: {},
    type: 'public'
});

export const E_SERVER_UNKNOWN_ERROR = errorRegistry.register({
    name: 'server_unknown_error',
    message: 'Something unexpected occured.',
    metadata: {},
    type: 'public'
});

export const E_INVALID_RESPONSE = errorRegistry.register({
    name: 'invalid_response',
    message: 'The response from remote is invalid.',
    metadata: {},
    type: 'public'
});
