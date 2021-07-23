export interface Doc {
  _id: string;
  _rev: string;
  _deleted?: boolean;
}
export type DocStub = Doc;
// List of docs that the SERVER needs and the CLIENT needs
// So, the client should request the documents declared under 'client',
// and send the documents to the server declared under 'server'
export interface Requests {
  server: DocStub[];
  client: DocStub[];
}
