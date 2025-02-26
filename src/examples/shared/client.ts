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
import { clientLogs } from './log';
import { IApis } from './decl';
import { testSendingStream, testRecvStream } from './stream';
import { sleep } from './test-utils';

export async function doClientTest(
    client: Tv.Clients.IClient<IApis>,
    connLess: boolean = false,

): Promise<void> {

    const pendingMessages: Record<string, boolean> = {};

    client.on('error', (e) => clientLogs.error(`Unexpected error: ${e}`));

    client.on('push_message', (msg) => {

        const sMsg = Buffer.concat(msg).toString();

        if (pendingMessages[sMsg]) {

            clientLogs.ok('Received message in time: ' + sMsg);
        }
        else {

            clientLogs.warning('Message delayed from server: ' + sMsg);
        }

        delete pendingMessages[sMsg];
    });

    client.on('close', () => clientLogs.warning('Connection closed'));

    const tests = [
        'echo',
        'api_not_found',
        'invalid_error_reply',
        'valid_error_reply',
        'invalid_data_in_json',
        'minimal_api',
        'void_reply',
        'server_close_connection',
        'client_close_connection',
        'test_message',
        'send_stream',
        'recv_stream',
    ] as const;

    const autoAsync = <T extends string>(n: T): T | `${T}Async` => Math.random() > 0.5 ? n : `${n}Async`;

    do {

        await sleep(200);

        const caseName = tests[Math.floor(Math.random() * tests.length)];

        const mkMsg = (msg: string) => `[${caseName}] ${msg}`;

        try {

            clientLogs.info(`[Started] ${caseName}`);
            switch (caseName) {
                case 'minimal_api':
                    try {

                        await client.invoke(autoAsync('minimalApi'));
                        clientLogs.ok(mkMsg(`Passed`));
                    }
                    catch (e) {

                        clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                    }
                    break;
                case 'void_reply':
                    try {

                        await client.invoke(autoAsync('replyVoid'), 'test');
                        clientLogs.ok(mkMsg(`Passed`));
                    }
                    catch (e) {

                        clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                    }
                    break;
                case 'invalid_error_reply':
                    try {

                        await client.invoke('throwInvalidError');
                        clientLogs.error(mkMsg(`Expected error not thrown`));
                    }
                    catch (e) {

                        if (e instanceof Tv.errors.server_internal_error) {

                            clientLogs.ok(mkMsg(`Expected error thrown, error: ${e}`));
                        }
                        else {

                            clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                        }
                    }
                    break;
                case 'valid_error_reply':
                    try {

                        await client.invoke('throwInvalidError');
                        clientLogs.error(mkMsg(`Expected error not thrown`));
                    }
                    catch (e) {

                        if (e instanceof Tv.errors.server_internal_error) {

                            clientLogs.ok(mkMsg(`Got expected error thrown, error: ${e}`));
                        }
                        else {

                            clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                        }
                    }
                    break;
                case 'echo':
                    try {

                        if ('hello' === await client.invoke(autoAsync('echo'), 'hello')) {

                            clientLogs.ok(mkMsg(`Got expected response`));
                        }
                        else {

                            clientLogs.error(mkMsg(`Unexpected response`));
                        }
                    }
                    catch (e) {

                        clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                    }
                    break;
                case 'api_not_found':
                    try {
                        await client.invoke('notFoundApi');
                    }
                    catch (e) {

                        if (e instanceof Tv.errors.api_not_found) {

                            clientLogs.ok(mkMsg(`Got expected error thrown, error: ${e}`));
                        }
                        else {

                            clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                        }
                    }
                    break;
                case 'invalid_data_in_json':
                    try {
                        await client.invoke(autoAsync('replyNonValidDataInJson'));
                    }
                    catch (e) {

                        if (e instanceof Tv.errors.server_internal_error) {

                            clientLogs.ok(mkMsg(`Got expected error thrown, error: ${e}`));
                        }
                        else {

                            clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                        }
                    }
                    break;
                case 'test_message':
                    try {

                        const msg = Date.now() + Math.random().toString();

                        pendingMessages[msg] = true;

                        await client.invoke(autoAsync('sendMeMessage'), msg);

                        if (msg in pendingMessages) {

                            setTimeout(() => {

                                if (msg in pendingMessages) {

                                    clientLogs.error(mkMsg(`Message not received in time`));
                                }

                            }, 1000);
                        }

                        clientLogs.ok(mkMsg(`Message triggered`));
                    }
                    catch (e) {

                        if (connLess && e instanceof Tv.errors.server_internal_error && (e.data as any)?.body?.message) {

                            switch ((e.data as any)?.body?.message) {

                                case 'cmd_not_impl':
                                    clientLogs.warning(mkMsg(`Specific command is not implemented by current protocol, skipped`));
                                    break;
                                default:
                                    clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                            }
                        }
                        else {

                            clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                        }
                    }
                    break;
                case 'send_stream': {
                    try {

                        const streamId = await client.invoke('createStreamToReceive');
                        setImmediate(() => {
                            testSendingStream(client, streamId, clientLogs)
                                .catch(e => clientLogs.error(`Failed to send data to stream#${streamId}`));
                        });
                    }
                    catch (e) {

                        if (connLess && e instanceof Tv.errors.server_internal_error && (e.data as any)?.body?.message) {

                            switch ((e.data as any)?.body?.message) {

                                case 'cmd_not_impl':
                                    clientLogs.warning(mkMsg(`Specific command is not implemented by current protocol, skipped: ${e}`));
                                    break;
                                case 'system_busy':
                                    clientLogs.warning(mkMsg(`Server is busy, skipped: ${e}`));
                                    break;
                                default:
                                    clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                            }
                        }
                        else {

                            clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                        }
                    }
                    break;
                }
                case 'recv_stream': {
                    try {

                        if (!client.transporter?.writable) {

                            await client.connect();
                        }
                        const stream = client.streams.create();
                        testRecvStream(stream, clientLogs);
                        await client.invoke('startSendingThroughStream', stream.id);
                    }
                    catch (e) {

                        if (connLess && e instanceof Tv.errors.server_internal_error && (e.data as any)?.body?.message) {

                            switch ((e.data as any)?.body?.message) {

                                case 'cmd_not_impl':
                                    clientLogs.warning(mkMsg(`Specific command is not implemented by current protocol, skipped`));
                                    break;
                                case 'system_busy':
                                    clientLogs.warning(mkMsg(`Server is busy, skipped: ${e}`));
                                    break;
                                default:
                                    clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                            }
                        }
                        else if (e instanceof Tv.errors.cmd_not_impl) {

                            clientLogs.warning(mkMsg(`Specific command is not implemented by current protocol, skipped`));
                        }
                        else {

                            clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                        }
                    }
                    break;
                }
                case 'server_close_connection':
                    if (Math.random() < 0.1) {
                        clientLogs.info(mkMsg(`Executed`));
                        try {
                            await client.invoke('closeConnection');
                            clientLogs.ok(mkMsg(`done`));
                        }
                        catch (e) {

                            clientLogs.error(mkMsg(`Unexpected error thrown, error: ${e}`));
                        }
                    }
                    else {
                        clientLogs.info(mkMsg(`Skipped`));
                    }
                    break;
                case 'client_close_connection': {
                    if (Math.random() < 0.1) {
                        clientLogs.info(mkMsg(`Executed`));
                        client.close();
                    }
                    else {
                        clientLogs.info(mkMsg(`Skipped`));
                    }
                    break;
                }
            }
            clientLogs.info(mkMsg(`Ended`));
        }
        catch (e) {

            clientLogs.error(mkMsg(`Error: ${e}`));
        }
    }
    while (1);

}