CREATE TABLE raw_client_documents (
  user_id INTEGER NOT NULL REFERENCES users(id),
  _id  TEXT NOT NULL,
  _rev TEXT NOT NULL,
  _deleted BOOLEAN NOT NULL,
  data BYTEA NOT NULL,
  PRIMARY KEY (user_id, _id)
);

CREATE TABLE raw_client_attachments (
  user_id INTEGER NOT NULL REFERENCES users(id),
  doc_id  TEXT NOT NULL,
  doc_rev TEXT NOT NULL,
  name TEXT NOT NULL,
  data BYTEA NOT NULL,
  PRIMARY KEY (user_id, doc_id, name)
);
