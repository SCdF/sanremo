export type DocId = string;
export type DocRev = string;
export interface Doc {
  _id: DocId;
  _rev: DocRev;
  _deleted?: boolean;
}
export type DocStub = Doc;

export interface User {
  id: number;
  name: string;
}

declare module 'express-session' {
  interface SessionData {
    user: User;
  }
}
