import { db } from '../db';
import { Doc, DocId, DocStub, User } from '../../shared/types';

export async function getStubsForUser(user: User): Promise<DocStub[]> {
  const result = await db.query(
    'SELECT _id, _rev, _deleted FROM raw_client_documents WHERE user_id = $1',
    [user.id]
  );
  return result.rows;
}

export async function getDocs(user: User, ids: DocId[]): Promise<Doc[]> {
  const result = await db.query(
    'SELECT data FROM raw_client_documents WHERE user_id = $1 AND _id = ANY($2)',
    [user.id, ids]
  );
  return result.rows.map(({ data }) => JSON.parse(data));
}

export async function putDocs(user: User, docs: Doc[]): Promise<void> {
  for (const doc of docs) {
    await db.query(
      [
        'INSERT INTO',
        '  raw_client_documents (user_id, _id, _rev, _deleted, data)',
        'VALUES ($1, $2, $3, $4, $5)',
        'ON CONFLICT ON CONSTRAINT raw_client_documents_pkey DO UPDATE SET',
        '  _rev = $3, _deleted = $4, data = $5',
      ].join(' '),
      [user.id, doc._id, doc._rev, !!doc._deleted, Buffer.from(JSON.stringify(doc))]
    );
  }
}
