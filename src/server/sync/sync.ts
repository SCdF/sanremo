import { matchStubsToUser } from './db';
import { DocStub, Requests, Doc } from './types';
import { User } from '../types';

async function declare(user: User, stubs: DocStub[]): Promise<Requests> {
  const toReturn: Requests = {
    server: [],
    client: [],
  };

  const serverDocs: DocStub[] = await matchStubsToUser(user, stubs);

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
      toReturn.server.push(userDoc);
    } // TODO: deal with rev numbers being the same but hash being different (ie, conflict)
  }

  for (const doc of stubs) {
    if (!serverDocsById.has(doc._id)) {
      toReturn.server.push(doc);
    }
  }

  return toReturn;
}

async function request(user: User, stubs: DocStub[]): Promise<Doc[]> {
  return [];
}

async function update(user: User, docs: Doc[]): Promise<DocStub[]> {
  return [];
}

const sync = {
  declare,
  request,
  update,
};

export default sync;
