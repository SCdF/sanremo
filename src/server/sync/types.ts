import type { DocStub } from '../../shared/types';

// List of docs that the SERVER needs and the CLIENT needs
// So, the client should request the documents declared under 'client',
// and send the documents to the server declared under 'server'
export interface Requests {
  server: DocStub[];
  client: DocStub[];
}
