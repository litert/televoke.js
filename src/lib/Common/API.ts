export interface IAPISchema {

    arguments: any;

    response: any;
}

export interface IServiceAPIs {

    [key: string]: IAPISchema;
}
