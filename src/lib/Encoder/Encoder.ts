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

import * as C from '../Common';

class Encoder implements C.IEncoder {

    public encode(socket: C.IWritable, content: any): void {

        content = JSON.stringify(content);

        const ret = Buffer.allocUnsafe(8);

        ret.writeUInt32LE(1, 0);
        ret.writeUInt32LE(Buffer.byteLength(content), 4);

        if (socket.writable) {

            socket.write(ret);
            socket.write(content);
        }
    }
}

export function createEncoder(): C.IEncoder {

    return new Encoder();
}
