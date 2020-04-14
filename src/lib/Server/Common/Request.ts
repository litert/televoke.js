export interface IRequest {

    readonly timeoutAt: number;

    readonly requestId: string | number;

    readonly args: any;

    readonly sentAt: number;

    readonly receivedAt: number;

    ok(returnValue: any): void;

    fail(error: any): void;
}
