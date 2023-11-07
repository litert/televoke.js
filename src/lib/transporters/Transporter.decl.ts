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

import type * as Shared from '../shared';

export interface IRouter {

    readonly encoding: string;
}

export interface IServer {

    readonly router: IRouter;

    /**
     * Register a transporter into the server, turning it into a channel.
     *
     * @param transporter   The transporter object.
     */
    registerChannel(transporter: ITransporter): void;

    /**
     * Process api calls from legacy client.
     *
     * @param callback      The callback function.
     * @param name          The api name.
     * @param args          The api arguments, decoded as JavaScript values.
     * @param transporter   The transporter object.
     */
    processLegacyApi(
        callback: ILegacyApiResponseCallback,
        name: string,
        args: unknown,
        transporter: Shared.ITransporter
    ): void;
}

export interface IGateway extends Shared.IEventListener<Shared.IDefaultEvents> {

    /**
     * Whether the gateway is running.
     */
    readonly running: boolean;

    /**
     * Start the gateway.
     */
    start(): Promise<void>;

    /**
     * Stop the gateway.
     */
    stop(): Promise<void>;
}

export interface ITransporterEvents extends Shared.IDefaultEvents {

    close(): void;

    frame(frameChunks: Buffer[]): void;

    end(): void;

    finish(): void;
}

export interface ITransporter extends Shared.IEventListener<ITransporterEvents> {

    /**
     * Whether the transporter is writable.
     */
    readonly writable: boolean;

    /**
     * Ends writing through the transporter.
     *
     * @param lastFrame The last frame.
     */
    end(lastFrame?: Buffer | string | Array<Buffer | string>): void;

    /**
     * Destroy the transporter.
     */
    destroy(): void;

    /**
     * Write a frame through the transporter.
     *
     * @param frame The frame to write.
     */
    write(frame: Buffer | string | Array<Buffer | string>): void;
}

export interface IConnector {

    /**
     * Connect to the remote endpoint.
     *
     * The returned promise will be resolved with the transporter object.
     */
    connect(): Promise<ITransporter>;
}

export type ILegacyApiResponseCallback = (body: unknown) => void;
