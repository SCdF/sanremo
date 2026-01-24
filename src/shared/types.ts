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

// Discriminated union for slug configuration - each type has its own shape
export type SlugConfig =
  | { type: SlugType.String; placeholder?: string }
  | { type: SlugType.URL; placeholder?: string }
  | { type: SlugType.Date }
  | { type: SlugType.Timestamp };

// Discriminated union pairing slug config with its value type
// The discriminant 'type' is at the top level so TypeScript can narrow properly
export type SlugData =
  | { type: SlugType.String; placeholder?: string; value: string }
  | { type: SlugType.URL; placeholder?: string; value: string }
  | { type: SlugType.Date; value: number }
  | { type: SlugType.Timestamp; value: number };

// Schema version 2: Checkbox values use unique IDs
export const CURRENT_SCHEMA_VERSION = 2;

export interface CheckboxValue {
  id: string;
  default: boolean;
}

export interface RepeatableDoc extends Doc {
  template: DocId;
  slug: string | number | undefined;
  created: number;
  updated: number;
  completed?: number;
  values: Record<string, boolean>;
  schemaVersion: 2;
}

export interface TemplateDoc extends Doc {
  deleted?: boolean;
  title: string;
  slug: SlugConfig;
  markdown: string;
  created: number;
  updated: number;
  versioned: number;
  values: CheckboxValue[];
  schemaVersion: 2;
}

// Legacy types for migration from schema version 1
export interface LegacyRepeatableDoc extends Doc {
  template: DocId;
  slug: string | number | undefined;
  created: number;
  updated: number;
  completed?: number;
  values: boolean[];
  schemaVersion?: undefined;
}

export interface LegacyTemplateDoc extends Doc {
  deleted?: boolean;
  title: string;
  slug: SlugConfig;
  markdown: string;
  created: number;
  updated: number;
  versioned: number;
  values: boolean[];
  schemaVersion?: undefined;
}

export interface ServerToClientEvents {
  docUpdate: (docs: Doc[]) => void;
}
export interface ClientToServerEvents {
  /** the client is in a position to receive streaming updates (ie they have finished their full sync) */
  ready: () => void;
  docUpdate: (docs: Doc[]) => void;
}
