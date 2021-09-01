import debugModule from 'debug';

export const debugSanremo = (...postfix: string[]) => debugModule(`sanremo:${postfix.join(':')}`);
