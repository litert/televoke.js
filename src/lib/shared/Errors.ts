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

import * as Constants from './Constants';

/**
 * The base class of all Televoke errors.
 */
export abstract class TelevokeError extends Error {

    public constructor(
        name: string,
        message: string,
        public readonly origin: unknown = null
    ) {

        super(message);
        this.name = name;
    }
}

export class ProtocolError extends TelevokeError {

    public constructor(
        message: string,
        public readonly data: unknown,
        origin: unknown,
    ) {

        super(Constants.PROTOCOL_ERROR_NAMESPACE, message, origin);
    }
}

function defineProtocolError<T extends string>(name: T): Record<T, new (
    data?: unknown,
    origin?: unknown
) => ProtocolError> {

    return {

        [name]: class extends ProtocolError {

            public constructor(data: unknown = null, origin: unknown = null) {

                super(name, data, origin);
            }
        },
    } as any;
}

const errorCtors = {

    ...defineProtocolError('incomplete_packet'),
    ...defineProtocolError('invalid_packet'),
    ...defineProtocolError('invalid_response'),
    ...defineProtocolError('channel_inactive'),
    ...defineProtocolError('channel_closed'),
    ...defineProtocolError('api_not_found'),
    ...defineProtocolError('cmd_not_impl'),
    ...defineProtocolError('network_error'),
    ...defineProtocolError('stream_not_found'),
    ...defineProtocolError('stream_aborted'),
    ...defineProtocolError('stream_closed'),
    ...defineProtocolError('stream_index_mismatch'),
    ...defineProtocolError('system_busy'),
    ...defineProtocolError('server_internal_error'),
    ...defineProtocolError('timeout'),
    ...defineProtocolError('unknown'),
    ...defineProtocolError('unprocessable_error'),

    ['app_error']: class AppError extends TelevokeError {

        public constructor(message: string, origin: unknown = null) {

            super(Constants.APP_ERROR_NAMESPACE, message, origin);
        }
    }
};

export class TvErrorResponse {

    public constructor(public readonly data: unknown) {}
}

export const errors: Readonly<typeof errorCtors> = errorCtors as any;
