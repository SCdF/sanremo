import { debugSanremo } from '../shared/globals';

export const debugClient = (...postfix: string[]) => debugSanremo('client', ...postfix);
