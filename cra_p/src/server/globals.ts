import { debugSanremo } from '../shared/globals';

export const debugServer = (...postfix: string[]) => debugSanremo('server', ...postfix);
