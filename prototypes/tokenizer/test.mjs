import { verify } from './verify.mjs';

console.log('Correctness:', JSON.stringify(await verify()));
