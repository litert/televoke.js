import * as C from './Common';

export function createIncrementRIDGenerator(base: number): C.IRIDGenerator {

    return () => base++;
}

export function createRandStringRIDGenerator(length: number, seed: string): C.IRIDGenerator {

    return function() {

        let ret: string = '';

        for (let i = 0; i < length; i++) {

            ret += seed[Math.floor(Math.random() * seed.length)];
        }

        return ret;
    };
}
