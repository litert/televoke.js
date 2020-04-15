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

export const E_GATEWAY_STARTING = ErrorHub.define(
    null,
    'E_GATEWAY_STARTING',
    'A gateway has already been starting.',
    {}
);

export const E_GATEWAY_CLOSING = ErrorHub.define(
    null,
    'E_GATEWAY_CLOSING',
    'A gateway has already been closing.',
    {}
);

export const E_SERVER_STARTING = ErrorHub.define(
    null,
    'E_SERVER_STARTING',
    'A server has already been starting.',
    {}
);

export const E_SERVER_CLOSING = ErrorHub.define(
    null,
    'E_SERVER_CLOSING',
    'A server has already been closing.',
    {}
);

export const E_SERVER_BUSY = ErrorHub.define(
    null,
    'E_SERVER_BUSY',
    'It is not able to update server currnetly.',
    {}
);

export const E_NO_SERVER_ATTACHED = ErrorHub.define(
    null,
    'E_NO_SERVER_ATTACHED',
    'The gateway does not attach to a server.',
    {}
);

export const E_SERVER_NOT_READY = ErrorHub.define(
    null,
    'E_SERVER_NOT_READY',
    'The server is not setup completely.',
    {}
);

export const E_GATEWAY_BUSY = ErrorHub.define(
    null,
    'E_GATEWAY_BUSY',
    'The gateway has been attached to a server.',
    {}
);
