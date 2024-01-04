import { getDocs, getStubsForUser, putDocs } from './db';
import { Requests } from './types';
import { DocStub, Doc, User } from '../../shared/types';

async function begin(user: User, clientStubs: DocStub[]): Promise<Requests> {
  const toReturn: Requests = {
    server: [],
    client: [],
  };

  const serverStubs: DocStub[] = await getStubsForUser(user);

  const serverStubsById = new Map(serverStubs.map((d) => [d._id, d]));
  const clientStubsById = new Map(clientStubs.map((d) => [d._id, d]));

  const toDelete: Doc[] = [];

  for (const serverStub of serverStubs) {
    if (!clientStubsById.has(serverStub._id)) {
      toReturn.client.push(serverStub);
      continue;
    }

    const clientStub: DocStub = clientStubsById.get(serverStub._id)!;

    if (clientStub._deleted) {
      toDelete.push(clientStub);
      continue;
    }
    if (serverStub._deleted) {
      toReturn.client.push(serverStub);
      continue;
    }

    const serverRev = Number(serverStub?._rev?.split('-')[0]);
    const clientRev = Number(clientStub?._rev?.split('-')[0]);

    if (serverRev > clientRev) {
      toReturn.client.push(serverStub);
    } else if (clientRev > serverRev) {
      toReturn.server.push(clientStub);
    } // TODO: deal with rev numbers being the same but hash being different (ie, conflict)
  }

  for (const stub of clientStubs) {
    if (!serverStubsById.has(stub._id)) {
      if (stub._deleted) {
        toDelete.push(stub);
      } else {
        toReturn.server.push(stub);
      }
    }
  }

  if (toDelete.length) {
    await putDocs(user, toDelete);
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
  begin,
  request,
  update,
};

export default sync;
