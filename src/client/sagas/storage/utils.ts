import { Doc } from '../../../shared/types';
import { Database } from '../../db';

// FIXME: https://github.com/pouchdb/pouchdb/issues/7841 means we have to performed deletes
// specifically, instead of generically alongside other writes
// This also means that the server has to treat deletes specifically, otherwise the
// revs that increments here will cause an infinite loop with other clients. On the server
// revs on deleted documents are ignored and they are all considered the same
export function splitDeletes(batch: Doc[]): { deletes: Doc[]; writes: Doc[] } {
  return batch.reduce(
    (acc, doc) => {
      if (doc._deleted) {
        acc.deletes.push(doc);
      } else {
        acc.writes.push(doc);
      }
      return acc;
    },
    { deletes: [] as Doc[], writes: [] as Doc[] }
  );
}

export async function writesFromRemote(handle: Database, writes: Doc[]) {
  // To avoid conflicts, AND to write the exact rev we're given, we need both write with
  // `new_edits: false` so we get to specify any _rev we want, AND delete any "conflicts".
  // Unfortunately, `new_edits: false` always creates conflicts, so we preemptively delete
  // the docs and then re-write them with their correct data and remote _rev
  await deletesFromRemote(handle, writes);

  await handle.bulkDocs(writes, {
    new_edits: false,
  });
}

export async function deletesFromRemote(handle: Database, deletes: Doc[]) {
  const deleteResults = await handle.allDocs({ keys: deletes.map((d) => d._id) });
  const deletedDocs = deleteResults.rows.map((row) => ({
    _id: row.key,
    // If the client doesn't have this document, the row will have
    //error: "not_found"
    // and no _rev. No _rev is okay, pouch will create one
    _rev: row?.value?.rev,
    _deleted: true,
  }));

  await handle.bulkDocs(deletedDocs);
}
