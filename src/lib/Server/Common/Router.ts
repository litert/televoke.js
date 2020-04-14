import { IRequest } from '../Common';

export type IHandler = (req: IRequest) => void | Promise<void>;

export interface IRouter {

    route(name: string): IHandler | void;
}
