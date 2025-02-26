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

import * as Crypto from 'node:crypto';

export function createRandomString(max: number): string {

    return Crypto.randomBytes(max).toString('base64url').slice(0, Math.ceil(Math.random() * max));
}

export function createRandomChunks(max: number = 10): [number, Buffer[]] {

    const ret = new Array(Math.ceil(Math.random() * max))
        .fill(0)
        .map(() => Crypto.randomBytes(Math.ceil(Math.random() * 1024)));

    return [
        ret.reduce((acc, cur) => acc + cur.byteLength, 0),
        ret
    ];
}

export const W_LEN = 2;
export const DW_LEN = 4;

export function ensureBufferArray(a: string | Buffer | Array<Buffer | string>): Buffer[] {

    if (Array.isArray(a)) {

        return a.map(i => i instanceof Buffer ? i : Buffer.from(i));
    }

    if (a instanceof Buffer) {

        return [a];
    }

    return [Buffer.from(a)];
}
