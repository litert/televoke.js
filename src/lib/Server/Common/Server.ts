import { IGateway } from './Gateway';
import { IRouter } from './Router';
import { Events } from '@litert/observable';

export interface IServerEvents extends Events.ICallbackDefinitions {

    'handler_error'(e: unknown): void;
}

export interface IServer extends Events.IObservable<IServerEvents> {

    addGateway(name: string, gateway: IGateway): this;

    removeGateway(name: string): this;

    setRouter(router: IRouter): this;

    start(): Promise<void>;

    close(): Promise<void>;
}
