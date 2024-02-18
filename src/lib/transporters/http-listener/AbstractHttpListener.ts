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

import * as Http from 'node:http';
import * as dH from './Http.Decl';
import { EventEmitter } from 'node:events';

export abstract class AbstractHttpListener extends EventEmitter implements dH.IHttpListener {

    protected _gateway: Http.Server | null = null;

    public port: number = 0;

    protected _upgradeProcessor: dH.IUpgradeProcessor = dH.DEFAULT_UPGRADE_PROCESSOR;

    protected _apiProcessor: dH.ILegacyHttpApiProcessor = dH.DEFAULT_LEGACY_HTTP_API_PROCESSOR;

    public setLegacyApiProcessor(processor: dH.ILegacyHttpApiProcessor | null): void {

        this._apiProcessor = processor ?? dH.DEFAULT_LEGACY_HTTP_API_PROCESSOR;

        this._gateway
            ?.removeAllListeners('request')
            .addListener('request', this._apiProcessor);
    }

    public setUpgradeProcessor(processor: dH.IUpgradeProcessor | null): void {

        this._upgradeProcessor = processor ?? dH.DEFAULT_UPGRADE_PROCESSOR;

        this._gateway
            ?.removeAllListeners('upgrade')
            .addListener('upgrade', this._upgradeProcessor);
    }

    public get running(): boolean {

        return !!this._gateway;
    }

    public abstract start(): Promise<void>;

    public abstract stop(): Promise<void>;
}
