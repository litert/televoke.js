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

import * as Shared from './Shared.decl';
import * as E from './Errors';
import { Readable } from 'node:stream';

export class TvBinaryReadStream extends Readable implements Shared.IBinaryReadStream {

    private _timer: NodeJS.Timeout | null = null;

    public constructor(
        public readonly id: number,
        private _timeout: number = 0,
    ) {

        super();

        if (_timeout > 0) {

            this._resetTimer();
        }
    }

    public setTimeout(timeout: number): void {

        if (timeout === this._timeout) {

            return;
        }

        this._timeout = timeout;

        if (timeout > 0) {

            if (this._timer) {

                clearTimeout(this._timer);
                this._timer = null;
            }

            this._resetTimer();
        }
    }

    private _resetTimer(): void {

        if (this.readableEnded) {

            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }
            return;
        }

        if (this._timer) {

            this._timer.refresh();
            return;
        }

        this._timer = setTimeout(() => {

            if (this.readableEnded) {

                return;
            }

            this._timer = null;

            this.destroy(new E.errors.timeout());

        }, this._timeout);
    }

    public push(buf: Buffer | null): boolean {

        if (this.readableEnded) {

            throw new E.errors.stream_closed();
        }

        if (this._timeout > 0) {

            this._resetTimer();
        }

        return super.push(buf);
    }

    public close(): void {

        if (this._timer) {

            clearTimeout(this._timer);
            this._timer = null;
        }

        this.push(null);
    }

    public abort(): void {

        if (this._timer) {

            clearTimeout(this._timer);
            this._timer = null;
        }

        this.destroy(new E.errors.stream_aborted());
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public _read(): void {
        return;
    }
}
