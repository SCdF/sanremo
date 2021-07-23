import { db } from '../db';
import { DocStub } from './types';
import { User } from '../types';

export async function matchStubsToUser(user: User, stubs: DocStub[]) {
  const result = await db.query(
    'select _id, _rev, _deleted from raw_client_documents where user_id = $1::number and _id in $2',
    [user.id, stubs.map((s) => s._id)]
  );
  return result.rows;
}
