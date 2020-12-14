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

import { errorRegistry } from '../Errors';

export const E_GATEWAY_STARTING = errorRegistry.register({
    name: 'gateway_starting',
    message: 'A gateway has already been starting.',
    metadata: {},
    type: 'public'
});

export const E_GATEWAY_CLOSING = errorRegistry.register({
    name: 'gateway_closing',
    message: 'A gateway has already been closing.',
    metadata: {},
    type: 'public'
});

export const E_SERVER_STARTING = errorRegistry.register({
    name: 'server_starting',
    message: 'A server has already been starting.',
    metadata: {},
    type: 'public'
});

export const E_SERVER_CLOSING = errorRegistry.register({
    name: 'server_closing',
    message: 'A server has already been closing.',
    metadata: {},
    type: 'public'
});

export const E_SERVER_BUSY = errorRegistry.register({
    name: 'server_busy',
    message: 'It is not able to update server currnetly.',
    metadata: {},
    type: 'public'
});

export const E_NO_SERVER_ATTACHED = errorRegistry.register({
    name: 'no_server_attached',
    message: 'The gateway does not attach to a server.',
    metadata: {},
    type: 'public'
});

export const E_SERVER_NOT_READY = errorRegistry.register({
    name: 'server_not_ready',
    message: 'The server is not setup completely.',
    metadata: {},
    type: 'public'
});

export const E_GATEWAY_BUSY = errorRegistry.register({
    name: 'gateway_busy',
    message: 'The gateway has been attached to a server.',
    metadata: {},
    type: 'public'
});
