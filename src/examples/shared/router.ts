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

import * as Tv from '../../lib';
import { serverLogs } from './log';
import { testRecvStream, testSendingStream } from './stream';

export const router: Tv.Servers.IRouter = new Tv.Servers.SimpleJsonApiRouter()
    .registerApi('minimalApi', (ctx): void => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked minimalApi`);
    })
    .registerApi('minimalApiAsync', async (ctx): Promise<void> => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked minimalApiAsync`);
    })
    .registerApi('replyVoid', (ctx, msg: string): void => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked replyVoid with message: ${msg}`);
    })
    .registerApi('replyVoidAsync', async (ctx, msg: string): Promise<void> => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked replyVoidAsync with message: ${msg}`);
    })
    .registerApi('echo', (ctx, text: string): string => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked echo with text: ${text}`);

        return text;
    })
    .registerApi('echoAsync', async (ctx, text: string): Promise<string> => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked echoAsync with text: ${text}`);

        return text;
    })
    .registerApi('sendMeMessage', (ctx, msg: string): void => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked sendMeMessage with message: ${msg}`);

        if (!ctx.channel.isMessageSupported) {

            throw new Tv.errors.cmd_not_impl();
        }

        ctx.channel.sendMessage(msg).catch(e => serverLogs.error(`Failed while sending message, error: ${e}`));
    })
    .registerApi('sendMeMessageAsync', async (ctx, msg: string): Promise<void> => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked sendMeMessageAsync with message: ${msg}`);

        try {
            await ctx.channel.sendMessage(msg);
        }
        catch (e) {
            serverLogs.error(`Failed while sending message, error: ${e}`);
            throw e;
        }
    })
    .registerApi('replyNonValidDataInJson', (ctx): unknown => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked test_bad_response`);

        return {
            f: BigInt(123)
        };
    })
    .registerApi('replyNonValidDataInJsonAsync', (ctx): Promise<unknown> => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked test_bad_response`);

        return Promise.resolve({
            f: BigInt(123)
        });
    })
    .registerApi('testExtBinChunks', (ctx, args): unknown => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked testExtBinChunks with args: ${JSON.stringify(args)}`);
        serverLogs.ok(`Channel#${ctx.channel.id} invoked testExtBinChunks with ext chunks: ${
            Buffer.concat((ctx.requestBinaryChunks ?? []).flat(2)).toString()
        }`);

        ctx.replyBinaryChunks = [
            Buffer.from('Hi, '),
            Buffer.from('Angus'),
            Buffer.from('.'),
            [Buffer.from('How are '), Buffer.from('you')],
            [Buffer.from('?')],
        ];

        return { v: 123 };
    })
    .registerApi('createStreamToReceive', (ctx): number => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked createStreamToReceive`);
        const stream = ctx.channel.streams.create();
        serverLogs.ok(`Opened stream #${stream.id}`);

        testRecvStream(stream, serverLogs);

        return stream.id;
    })
    .registerApi('startSendingThroughStream', (ctx, streamId: number): void => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked startSendingThroughStream`);
        testSendingStream(ctx.channel, streamId, serverLogs)
            .catch(e => serverLogs.error(`Failed to send data to stream#${streamId}`));
    })
    .registerApi('closeConnection', (ctx): void => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked closeConnection`);

        ctx.channel.close();
    })
    .registerApi('throwValidError', (ctx): void => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked throwValidError`);

        throw new Tv.TvErrorResponse({
            text: 'The data of this error could be sent to client',
            code: 12345
        });
    })
    .registerApi('throwInvalidError', (ctx): void => {

        serverLogs.ok(`Channel#${ctx.channel.id} invoked throwValidError`);

        throw {
            text: 'The data of this error will not be sent to client',
            code: 12345
        };
    });
