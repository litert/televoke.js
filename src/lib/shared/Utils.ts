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

/**
 * Ensures that a function is only called once.
 *
 * @param fn    The function to call.
 * @returns     The wrapped function.
 */
export function once<T extends (...args: any[]) => any>(fn: T): T {

    let called = false;
    let result: any;

    return function(...args: any[]) {

        if (!called) {

            called = true;
            result = fn(...args);
        }

        return result;
    } as T;
}

export function buffer2json(data: Buffer[]): unknown {

    let str = '';
    const td = new TextDecoder('utf-8', { fatal: true });

    for (const seg of data) {

        str += td.decode(seg, { stream: true });
    }

    return JSON.parse(str);
}
