// FIXME: this is a bug in the pouch db type declarations
// Also missing PouchDB.Core.AllDocsResponse.rows[].error === 'not_found'
declare module 'pouchdb-adapter-indexeddb';

// cookie package doesn't provide types in older versions
declare module 'cookie' {
  // biome-ignore lint/suspicious/noExplicitAny: cookie package has no type definitions
  export function parse(str: string, options?: any): { [key: string]: string };
  // biome-ignore lint/suspicious/noExplicitAny: cookie package has no type definitions
  export function serialize(name: string, val: string, options?: any): string;
}
