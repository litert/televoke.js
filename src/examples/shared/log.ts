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

export class Logger {

    public constructor(
        private _endpoint: string
    ) {}

    public error(message: string): void {

        console.error(`[${new Date().toISOString()}][ERROR] ${this._endpoint}: ${message}`);
    }

    public ok(message: string): void {

        console.info(`[${new Date().toISOString()}][OK] ${this._endpoint}: ${message}`);
    }

    public info(message: string): void {

        console.info(`[${new Date().toISOString()}][INFO] ${this._endpoint}: ${message}`);
    }

    public warning(message: string): void {

        console.warn(`[${new Date().toISOString()}][WARNING] ${this._endpoint}: ${message}`);
    }
}

export const serverLogs = new Logger('Server');

export const clientLogs = new Logger('Client');
