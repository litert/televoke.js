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

import { TelevokeError } from '../../shared';

export const E_WORKER_THREAD_OFFLINE = class extends TelevokeError {

    public constructor(origin: unknown = null) {

        super(
            'worker_thread_offline',
            'The worker thread is offline.',
            origin
        );
    }
};

export const E_MAIN_THREAD_ONLY = class extends TelevokeError {

    public constructor(origin: unknown = null) {

        super(
            'main_thread_only',
            'The operation is only allowed in the main thread.',
            origin
        );
    }
};

export const E_WORKER_THREAD_ONLY = class extends TelevokeError {

    public constructor(origin: unknown = null) {

        super(
            'worker_thread_only',
            'The operation is only allowed in a worker thread.',
            origin
        );
    }
};
