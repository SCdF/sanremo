import { getDocs, getStubsForUser, putDocs } from "./db";
import { Requests } from "./types";
import { DocStub, Doc, User } from "../types";

// import * as debugLib from "debug";

// const debug = debugLib.debug("sanremo:server:sync");

async function declare(user: User, stubs: DocStub[]): Promise<Requests> {
  const toReturn: Requests = {
    server: [],
    client: [],
  };

  const serverDocs: DocStub[] = await getStubsForUser(user);

  const serverDocsById = new Map(serverDocs.map((d) => [d._id, d]));
  const userDocsById = new Map(stubs.map((d) => [d._id, d]));

  for (const doc of serverDocs) {
    if (!userDocsById.has(doc._id)) {
      toReturn.client.push(doc);
      continue;
    }
    const userDoc: Doc = userDocsById.get(doc._id)!;

    // TODO: move this number extraction into an abstraction
    const serverDocRev = Number(doc._rev.split("-")[0]);
    const userDocRev = Number(userDoc._rev.split("-")[0]);

    if (serverDocRev > userDocRev) {
      toReturn.client.push(doc);
    } else if (userDocRev > serverDocRev) {
      // TODO: if the server needs to get a doc that is deleted, just delete it
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
  const serverDocs = await getDocs(stubs.map((s) => s._id));
  // TODO: care about the user being passed in for security
  // TODO: make sure that the revision matches
  // TODO: consider throwing some kind of error when the document doesn't exist on the server
  return serverDocs;
}

async function update(user: User, docs: Doc[]): Promise<void> {
  // TODO: care about the user being passed in for security
  // TODO: consider also caring about the revision here
  await putDocs(user, docs);
}

const sync = {
  declare,
  request,
  update,
};

export default sync;
