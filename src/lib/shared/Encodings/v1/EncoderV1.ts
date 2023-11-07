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

import * as dEncV1 from './Protocol.v1.decls';

export class TvEncoderV1 {

    public encodeApiRequest(
        rid: string | number,
        name: string,
        args: unknown,
        timeout: number,
    ): string {

        return JSON.stringify({
            ttl: timeout,
            rid,
            api: name,
            args,
            cst: Date.now(),
        } satisfies dEncV1.IRequestPayloadV1);
    }

    public encodeApiOkResponse(
        rid: string | number,
        body: unknown,
        recvAt: number
    ): string {

        return JSON.stringify({
            rid,
            body,
            sst: Date.now(),
            srt: recvAt,
            code: dEncV1.EResponseCode.OK,
        } satisfies dEncV1.IResponsePayloadV1);
    }

    public encodeApiErrorResponse(
        rid: string | number,
        errorCode: dEncV1.EResponseCode,
        body: string,
        recvAt: number
    ): string {

        if (typeof rid === 'string') {

            rid = JSON.stringify(rid);
        }

        return `{"rid":${rid},"body":${body},"sst":${Date.now()},"srt":${recvAt},"code":${errorCode}}`;
    }
}
