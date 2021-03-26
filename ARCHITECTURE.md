# Data structures

## Repeatable template

```json
{
    "_id": "repeatable:template:<uuid>:<version>",
    "title": "Name of the template",
    "slug": {
        "type": "URL|date|timestamp|string",
        "label": "What to title your slug",
        "placeholder": "for inputs, e.g. an example url"
    },
    "markdown": "a massive string of markdown",
    "values": [
        false,
        false,
        ""
    ],
    "created": 1234567890,
    "versioned": 1234567890,
    "updated": 1234567890,
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
    "values": [
        true,
        false,
        "some kind of text input"
    ],
    "created": 1234567890,
    "updated": 1234567890,
    "completed": 1234567890,
    "notes": "arbitrary user entered markdown block for notes for this entry"
}
```

- Index on `template`, `updated`, `completed`
- `values` align to editable data described in the specified template

# Future

An ever evolving plan for how to move forward.

We want to keep using PouchDB to dogfood. However, it sucks for complex permission / sharing scenarios (or any permissions at all really).

## Private Non Social repeatables: Pure PouchDB / CouchDB

- DB per user
- DB per group / team
- User / Group template DB (maybe)
- Can mark completed repeatable as public, get URL, and share that somewhere.

Access:
- Expose user / group DBs as replicatable, using CouchDB permissions at DB level.
- Users directly replicate between their server user and every group they are in. Groups are a future thing so we won't worry for now, but it's likely we'll treat it as scoped like slack workspaces, so the client will only actively hold open one replication at a time, as well as occasionally rotate through all groups to check as a single replication.
- Published repeatables work by contacting an API which first loads the document and confirms it's public before passing it back. This doesn't allow you to "follow" it live, which is why they'd have to be completed first.

Unanswered questions:
- How do you deal with public links to templates. View them and then one click clone into your env? With another button to "sync" them, aka replace them with whatever is *now* at the public URL? This stops us needing to manage syncing backend for this, and *also* (totally intentionally) gives control to the user as to when they change!

## Public "Social" repeatables: ???

Influences / socials:
- A fitness influencer publishes their warmups / cooldowns / sets into repeatables
- A cook publishes step by step recipies, including initial shopping lists and then steps
- Coding blogger / company publishes / publicises their checklist for good code reviews

You / followers:
- See a news feed of published templates from above
- Clone / favourite / fork / whatever templates you like. These both:
    - Are changable BY YOU (to add your own spin) and are republishable by you with those changes (including lineage / parentage / history?)
    - If you don't change them but the influencer does, you get that change automatically?
    - If you DO change them AND the influence does, what happens?
- You can comment / like templates, influencer can see this etc (standard social). Liking = cloning for use?

This is all template publishing: it's not publishing instances. Would that ever make sense? Publish a repeatable recipie and the end picture? This would only make sense if their was variability to how you could fill them out.

### Tech for this

CouchDB can't handle this. Naive implementation would be have a user_wall which represents the "Wall" of that user. Replications from each person they follow into their wall DB.

Not only won't scale, but we can be OK with this not being offline first. So build it out "traditional" way, whatever that is, but not CouchDB. If we ever get this far there are open source social networks we can learn from.
