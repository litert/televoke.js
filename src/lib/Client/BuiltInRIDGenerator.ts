import * as C from './Common';

export function createIncreasementRIDGenerator(base: number): C.IRIDGenerator {

    return () => base++;
}

export function creatRandStringRIDGenerator(length: number, seed: string): C.IRIDGenerator {

    return function() {

        let ret: string = '';

        for (let i = 0; i < length; i++) {

            ret += seed[i % seed.length];
        }

        return ret;
    };
}
