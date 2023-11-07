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

import * as LwDFX from '@litert/lwdfx';
import type * as dT from '../Transporter.decl';
import { LwDFXTransporter } from './LwDFX.Transporter';

class LwDfxTlsConnector implements dT.IConnector {

    public constructor(private readonly _opts: LwDFX.Tls.ITlsClientOptions) {}

    public async connect(): Promise<dT.ITransporter> {

        return new LwDFXTransporter('lwdfx/tls', await LwDFX.Tls.connect(this._opts));
    }
}

export function createTlsConnector(opts: LwDFX.Tls.ITlsClientOptions): dT.IConnector {

    return new LwDfxTlsConnector(opts);
}
