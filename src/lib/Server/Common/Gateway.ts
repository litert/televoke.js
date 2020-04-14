import { IRawRequest, IRawResponse } from '../../Common';

export type IReplyCallbak = (data: IRawResponse) => void;

export interface IGateway {

    onRequest: (
        request: IRawRequest,
        reply: IReplyCallbak
    ) => void;

    onError: (e: unknown) => void;

    start(): Promise<void>;

    close(): Promise<void>;
}
