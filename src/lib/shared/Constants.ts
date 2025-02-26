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

/**
 * The namespace of protocol errors.
 */
export const PROTOCOL_ERROR_NAMESPACE = 'tv_error';

/**
 * The namespace of application layer errors.
 */
export const APP_ERROR_NAMESPACE = 'app_error';

/**
 * The default timeout value of each new binary stream.
 */
export const DEFAULT_STREAM_TIMEOUT = 30_000;

/**
 * The default maximum number of streams of a stream manager.
 */
export const DEFAULT_MAX_STREAMS = 10;
