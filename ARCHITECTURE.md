# Data structures

## Checklist template

```json
{
    "_id": "checklist:template:<uuid>",
    "title": "Title name of checklist",
    "items": [
        {
            "_id": "<uuid>",
            "text": "description beside checkbox",
            "checked": false
        }
    ]
}
```

## Checklist instance

Instances are copies of templates with additional data.

```json
{
    "_id": "checklist:instance:<uuid>",
    "template": "checklist:template:<uuid>",
    "title": "Same as template",
    "created": 1234567890,
    "updated": 1234567890,
    "completed": 1234567890,
    "items": [
        {
            "_id": "<uuid>",
            "text": "description beside checkbox",
            "type": "checkbox|note",
            "checked": false
        }
    ]
}
```

# Indexes

Defined in `./client/db.js`

# Future Architecture

We want to keep using PouchDB to dogfood. However, it sucks for complex permission / sharing scenarios (or any permissions at all really).

## Adding public / shared data support

- Migrate all server-side data to PostgreSQL
- Migrate client-side to dual PouchDB setup:
  - When creating a new (=no existing pdb db etc) browser session ask server for data. Request = user, Response = {data: [], sync: url}.
    - data is all data relevant to that person, pulled from Postgres
    - sync is the URL for a newly created empty CouchDB db instance just for them
  - Create a local PouchDB (or any storage really) with data, create empty PouchDB locally that links to url.
  - When a data change happens, write a DIFF (alternatively start with whole document for simplicity, optimise later) into the linked PouchDB
  - Write client and server side code that takes data from that sync DB and uses it to update and keep data in check on both ends
- Now, when requesting to view a checklist / whatever, we can look locally first, and if that fails fire a request to the api to see if it's a public thing we can view.
   - Unclear if we'd then take that document and add it to our local? Would updates to it then sync? Would we take it off at some point? Simplist first step would be just not, you have to be online to see that stuff.
