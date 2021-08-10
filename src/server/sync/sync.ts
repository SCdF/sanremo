import { getDocs, getStubsForUser, putDocs } from './db';
import { Requests } from './types';
import { DocStub, Doc, User } from '../types';

// import * as debugLib from "debug";

// const debug = debugLib.debug("sanremo:server:sync");

async function declare(user: User, clientStubs: DocStub[]): Promise<Requests> {
  const toReturn: Requests = {
    server: [],
    client: [],
  };

  const serverDocs: DocStub[] = await getStubsForUser(user);

  const serverDocsById = new Map(serverDocs.map((d) => [d._id, d]));
  const userDocsById = new Map(clientStubs.map((d) => [d._id, d]));

  for (const doc of serverDocs) {
    if (!userDocsById.has(doc._id)) {
      toReturn.client.push(doc);
      continue;
    }
    const userDoc: Doc = userDocsById.get(doc._id)!;

    const serverDocRev = Number(doc._rev.split('-')[0]);
    const userDocRev = Number(userDoc._rev.split('-')[0]);

    if (serverDocRev > userDocRev) {
      toReturn.client.push(doc);
    } else if (userDocRev > serverDocRev) {
      toReturn.server.push(userDoc);
    } // TODO: deal with rev numbers being the same but hash being different (ie, conflict)
  }

  for (const stub of clientStubs) {
    if (!serverDocsById.has(stub._id)) {
      toReturn.server.push(stub);
    }
  }

  return toReturn;
}

async function request(user: User, stubs: DocStub[]): Promise<Doc[]> {
  const serverDocs = await getDocs(
    user,
    stubs.map((s) => s._id)
  );

  // TODO: make sure that the revision matches
  // TODO: consider throwing some kind of error when the document doesn't exist on the server
  return serverDocs;
}

async function update(user: User, docs: Doc[]): Promise<void> {
  // TODO: consider also caring about the revision here
  await putDocs(user, docs);
}

const sync = {
  declare,
  request,
  update,
};

export default sync;
