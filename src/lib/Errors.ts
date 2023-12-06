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

import * as $Exceptions from '@litert/exception';

export const errorRegistry = $Exceptions.createExceptionRegistry({
    'module': 'televoke.litert.org',
    'types': {
        'public': {
            'index': $Exceptions.createIncreaseCodeIndex(1)
        }
    }
});

export const E_PACKET_TOO_LARGE = errorRegistry.register({
    name: 'packet_too_large',
    message: 'The packet is larger than the maximum size of packet.',
    metadata: {},
    type: 'public'
});

export const E_INVALID_PACKET = errorRegistry.register({
    name: 'invalid_packet',
    message: 'The packet is invalid.',
    metadata: {},
    type: 'public'
});
