import { db } from "../db";
import { Doc, DocId, DocStub, User } from "../types";

export async function getStubsForUser(user: User): Promise<DocStub[]> {
  const result = await db.query("SELECT _id, _rev, _deleted FROM raw_client_documents WHERE user_id = $1", [user.id]);
  return result.rows;
}

export async function getDocs(ids: DocId[]): Promise<Doc[]> {
  // TODO: care about the user for security
  const result = await db.query("SELECT data FROM raw_client_documents WHERE _id = ANY($1)", [ids]);
  return result.rows.map(({ data }) => JSON.parse(data));
}

export async function putDocs(user: User, docs: Doc[]): Promise<void> {
  // TODO: care about the user for security
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // TODO: also get rid of attachments
    await client.query("DELETE FROM raw_client_documents WHERE _id = ANY($1)", [docs.map((d) => d._id)]);

    // TODO: also deal with attachments
    // FIXME: for performance collapse this into one insert somehow
    for (const doc of docs) {
      await client.query(
        "INSERT INTO raw_client_documents (user_id, _id, _rev, _deleted, data) VALUES ($1, $2, $3, $4, $5)",
        [user.id, doc._id, doc._rev, doc._deleted || false, Buffer.from(JSON.stringify(doc))]
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
