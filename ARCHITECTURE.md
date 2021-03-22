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

## Pure PouchDB / CouchDB

- Each user gets their own db
- There is also a main db
- When a user is created (verified on server boot) we create their userdb, and push two continuous replications into \_replications
    - user -> main, excluding ddocs
    - main -> user, using a `selector` like:
```json
{
    "selector": {
        "$or": [
            {"viewable_by": "<username>"},
            {"viewable_by": "<group_one>"},
            {"viewable_by": "<another_group_you're_in>"}
        ]
    }
}
```
    Or ideally:
```json
{
    "selector": {
        "viewable_by": {
            "$in": ["<username>", "<group_one>", "<another_group_you're_in>"]
        }
    }
}
```
    If the latter works with an index (it should but I'm suspicious.
- The ddoc on the user db can also be in main and replicated this way, migth as well, keep it at one index (couch can't use more than one)
- This ddoc can contain a save document check to make sure this isn't being changed in a way that the user isn't allowed to do
- Docunents that get created get the `viewable_by` (or whatever we call it) property. Default as username. If you want to share with group (future feature) it would change to that group.
- This **only** declares replication, more complicated rules about editing acceptability etc is just dealt with as local logic, that can be copied into the write check in the server side ddoc
- There is no allowed public access to `/main/*`. All of this is dealt with via a built api.
- Public documents (those that are marked this way) will be in `main` due to above, and can be checked by a server before returning to make sure they are actually public.
- Groups: users can be in multiple groups, documents cannot.

## Postgres Idea: Adding public / shared data support

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
