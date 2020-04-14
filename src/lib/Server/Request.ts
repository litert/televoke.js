import * as C from './Common';
import * as G from '../Common';

export class Request implements C.IRequest {

    private _sent!: boolean;

    public constructor(
        private _raw: G.IRawRequest,
        private _reply: C.IReplyCallbak
    ) {}

    public readonly receivedAt = Date.now();

    public get timeoutAt(): number { return this._raw.ttl + this.receivedAt; }

    public get requestId(): string | number { return this._raw.rid; }

    public get args(): any { return this._raw.args; }

    public get sentAt(): number { return this._raw.sat; }

    public ok(data: {}): void {

        if (this._sent) { return; }

        this._sent = true;

        this._reply({
            rid: this._raw.rid,
            rat: this.receivedAt,
            sat: this.receivedAt,
            code: G.EResponseCode.OK,
            body: data,
        });
    }

    public fail(data: {}): void {

        if (this._sent) { return; }

        this._sent = true;

        this._reply({
            rid: this._raw.rid,
            rat: this.receivedAt,
            sat: this.receivedAt,
            code: G.EResponseCode.FAILURE,
            body: data,
        });
    }
}
