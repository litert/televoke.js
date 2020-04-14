import * as G from '../Common';

export type IRIDGenerator = () => string | number;

export interface IClient<S extends G.IServiceAPIs = G.IServiceAPIs> {

    connect(): Promise<void>;

    invoke<K extends keyof S>(api: K, args: S[K]['arguments'], timeout?: number): Promise<S[K]['response']>;

    close(): Promise<void>;
}
