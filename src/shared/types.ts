export type DocId = string;
export type DocRev = string;
export interface Doc {
  _id: DocId;
  _rev?: DocRev;
  _deleted?: boolean;
}
export type DocStub = Doc;

export interface User {
  id: number;
  name: string;
}

enum SlugType {
  Date = 'date',
  Timestamp = 'timestamp',
  URL = 'url',
  String = 'string',
}

export interface RepeatableDoc extends Doc {
  template: DocId;
  slug: string | number;
  created: number;
  updated: number;
  completed?: number;
  values: any[];
}

export interface TemplateDoc extends Doc {
  title: string;
  slug: {
    type: SlugType;
    placeholder?: string;
  };
  markdown: string;
  values: any[];
}
