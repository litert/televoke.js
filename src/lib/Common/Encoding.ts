export interface IWritable {

    write(buf: Buffer | string, cb?: () => void): void;
}

export interface IEncoder {

    encode(socket: IWritable, content: any): void;
}

export interface IDecoder<T> {

    onProtocolError: (e: unknown) => void;

    onLogicError: (e: unknown) => void;

    onData: (data: T) => void;

    decode(chunk: Buffer): void;

    reset(): void;
}
