import * as C from './Common';

export interface ISimpleRouter extends C.IRouter {

    addHandler(apiName: string, handler: C.IHandler): this;

    removeHandler(apiName: string): this;
}

class SimpleRouter implements ISimpleRouter {

    private _handlers: Record<string, C.IHandler> = {};

    public addHandler(apiName: string, handler: C.IHandler): this {

        this._handlers[apiName] = handler;
        return this;
    }

    public removeHandler(apiName: string): this {

        delete this._handlers[apiName];
        return this;
    }

    public route(name: string): C.IHandler | void {

        return this._handlers[name];
    }
}

export function createSimpleRouter(): ISimpleRouter {

    return new SimpleRouter();
}
