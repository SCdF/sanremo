import { Client } from 'pg';

interface User {
  id: number;
  name: string;
}

interface Doc {
  _id: string;
  _rev: string;
  _deleted?: boolean;
}
type DocStub = Doc;

// List of docs that the SERVER needs and the CLIENT needs
// So, the client should request the documents declared under 'client',
// and send the documents to the server declared under 'server'
interface Requests {
  server: DocStub[];
  client: DocStub[];
}

async function declare(
  db: Client,
  user: User,
  stubs: DocStub[]
): Promise<Requests> {
  const result = await db.query(
    'select _id, _rev, _deleted from raw_client_documents where user_id = $1::number and _id in $2',
    [user.id, stubs.map((s) => s._id)]
  );

  const toReturn: Requests = {
    server: [],
    client: [],
  };

  const serverDocs: DocStub[] = result.rows;

  const serverDocsById = new Map(serverDocs.map((d) => [d._id, d]));
  const userDocsById = new Map(stubs.map((d) => [d._id, d]));

  for (const doc of serverDocs) {
    if (!userDocsById.has(doc._id)) {
      toReturn.client.push(doc);
      continue;
    }
    const userDoc: Doc = userDocsById.get(doc._id)!;

    // TODO: move this number extraction into an abstraction
    const serverDocRev = Number(doc._rev.split('-')[0]);
    const userDocRev = Number(userDoc._rev.split('-')[0]);

    if (serverDocRev > userDocRev) {
      toReturn.client.push(doc);
    } else if (userDocRev > serverDocRev) {
      toReturn.server.push(doc);
    } // TODO: deal with rev numbers being the same but hash being different (ie, conflict)
  }

  for (const doc of stubs) {
    if (!serverDocsById.has(doc._id)) {
      toReturn.server.push(doc);
    }
  }

  return toReturn;
}

async function request(db: Client, stubs: DocStub[]): Promise<Doc[]> {
  return [];
}

async function update(db: Client, docs: Doc[]): Promise<DocStub[]> {
  return [];
}

export default {
  declare,
  request,
  update,
};
