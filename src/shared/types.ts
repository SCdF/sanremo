// FIXME: replace as much of this with PouchDB types
// type Foo = PouchDB.Core.ExistingDocument<RepeatableDoc>;

export type DocId = string;
export type DocRev = string;
export interface Doc {
  _id: DocId;
  _rev?: DocRev;
  _deleted?: boolean;
}
export type DocStub = Doc;

export type UserId = number;
export interface User {
  id: UserId;
  name: string;
}

export enum SlugType {
  Date = 'date',
  Timestamp = 'timestamp',
  URL = 'url',
  String = 'string',
}
export interface RepeatableDoc extends Doc {
  template: DocId;
  slug: string | number | undefined;
  created: number;
  updated: number;
  completed?: number;
  values: boolean[];
}

export interface TemplateDoc extends Doc {
  deleted?: boolean;
  title: string;
  slug: {
    type: SlugType;
    placeholder?: string;
  };
  markdown: string;
  created: number;
  updated: number;
  versioned: number;
  values: boolean[];
}

export interface ServerToClientEvents {
  docUpdate: (docs: Doc[]) => void;
}
export interface ClientToServerEvents {
  /** the client is in a position to receive streaming updates (ie they have finished their full sync) */
  ready: () => void;
  docUpdate: (docs: Doc[]) => void;
}
