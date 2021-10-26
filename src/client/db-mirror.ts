import PouchDB from 'pouchdb-core';
import IdbAdapter from 'pouchdb-adapter-idb';
import Find from 'pouchdb-find';

import DeepDiff from 'deep-diff';

import { User } from '../shared/types';
import { Debugger } from 'debug';
import { debugClient } from './globals';
import { Guest } from './features/User/userSlice';
import { Database } from './db';

PouchDB.plugin(IdbAdapter);
PouchDB.plugin(Find);

const debugs = {} as Record<string, Debugger>;
const debug = (name: string) => {
  if (!debugs[name]) {
    debugs[name] = debugClient('database', name);
  }
  return debugs[name];
};

export default function mirrored(db: Database, loggedInUser: User | Guest): Database {
  // we want the laziness to be encapsulated here so that handle() can be synchronous
  const indexeddbPromise = import('pouchdb-adapter-indexeddb').then(
    ({ default: indexeddbAdapter }) => {
      PouchDB.plugin(indexeddbAdapter);
      return new PouchDB(`sanremo-${loggedInUser.name}-indexeddb`, {
        auto_compaction: true,
        adapter: 'indexeddb',
      }) as Database;
    }
  );

  return new Proxy(db, {
    get: function (idb: Database, prop, receiver) {
      // skipping these because:
      //   userPut: our own function, just calls db.put which will be caught later
      //   changes: not a promise and not really possible to bench, only used in setup.ts as of writing
      //   info: not a promise or interested inperf of, read only and pulls db specific data back
      if (['userPut', 'changes', 'info'].includes(String(prop))) {
        return Reflect.get(idb, prop, receiver);
      }

      return function () {
        const args = arguments;
        return indexeddbPromise.then(async (indexeddb: Database) => {
          let idbTime = performance.now();
          // @ts-ignore
          const idbResult = await idb[prop](...args);
          idbTime = performance.now() - idbTime;

          let indexeddbTime = performance.now();
          // @ts-ignore
          const indexeddbResult = await indexeddb[prop](...args);
          indexeddbTime = performance.now() - indexeddbTime;

          const timeDiff = idbTime - indexeddbTime;
          debug(String(prop))(
            `indexeddb ${timeDiff >= 0 ? '<' : '> (!!!)'} idb (~${Math.round(
              Math.abs(timeDiff) * 1000
            )}μs)`,
            timeDiff
          );

          const diff = DeepDiff.diff(idbResult, indexeddbResult);
          if (diff && diff.length) {
            debug(String(prop))(`returned different results`, idbResult, indexeddbResult, diff);
            console.warn(`${String(prop)} returned different results`, {
              idbResult,
              indexeddbResult,
              diff,
            });
            alert('different results returned, check the logs');
          }
          return idbResult;
        });
      };
    },
  });
}
