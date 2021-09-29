# Data structures

## Repeatable template

```json
{
  "_id": "repeatable:template:<uuid>:<version>",
  "title": "Name of the template",
  "slug": {
    "type": "url|date|timestamp|string",
    "placeholder": "for inputs, e.g. an example url"
  },
  "markdown": "a massive string of markdown",
  "values": [false, false, ""],
  "created": 1234567890,
  "versioned": 1234567890,
  "updated": 1234567890
}
```

- When modifying a template, use the `template` index defined below to see if you need to create a new version or not (ie is there an instance that relies on this version)
- `created` is the first time this template is created
- `versioned` is the first time this version was created / forked
- `updated` changes on every edit
- `values` align to editable data described in the specified template, this is the default

## Repeatable instance

```json
{
  "_id": "repeatable:instance:<uuid>",
  "template": "<template._id>",
  "slug": "something that uniquely (not enforced) identifies / links this repeatable, e.g. a date, or a URL of a build this checklist is for",
  "values": [true, false, "some kind of text input"],
  "created": 1234567890,
  "updated": 1234567890,
  "completed": 1234567890,
  "notes": "arbitrary user entered markdown block for notes for this entry"
}
```

- Index on `template`, `updated`, `completed`
- `values` align to editable data described in the specified template

# Markdown support

- Generic markdown supported

## Checkboxes

Expect `- [ ] blah`. The `blah` can also have generic markdown in it.

# Synchronization 0.1

Synchronization is instantiated as a _terribly inefficient_ full sync via an api, in streaming updates are handled by socket.io. There are lots of issues with this method, detailed below.

See:

- [Client side synchronization](./src/client/components/Sync.tsx)
- [Server side synchronization](./src/server/sync)

The generic flow is as follows: on instantiation or on waking up / reconnection:

- the client socket (re)connects to the server
- a full sync is performed:
  - the client collects a list of every document it knows about, including deletions
  - this list is sent to the server (`/api/sync/begin`). The server then determines what it is missing and what the client is missing.
    _(Deletes are also dealt with here, generically, as we don't consider deletes reversible. The content doesn't matter, if we get a `_deleted: true` we just store that stub and move on)_
  - the client then asks for what it needs, sends what the server needs
- the client socket emits `ready`, which adds its to a server socket pool. Changes from other clients are now streamed to this client until it disconnects.
- additionally, any client side changes are put into a stale queue, and pushed up via the socket after a small delay

## Issues

See also [the route documentation](./src/server/sync/routes.ts).

1. the full synchronization is incredibly full and thus incredibly dumb
2. deletes are fine for now but they may not stay that way, depending on how we use deletes
3. there are race conditions between the full synchronization occurring and the client socket emitting `ready`
