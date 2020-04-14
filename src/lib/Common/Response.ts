export enum EResponseCode {

    OK,
    API_NOT_FOUND,
    SYSTEM_ERROR,
    FAILURE
}

export interface IRawResponse {

    sat: number;

    rat: number;

    rid: string | number;

    code: number;

    body: any;
}
