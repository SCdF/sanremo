# Data structures

## Checklist template

```json
{
    "_id": "checklist:template:<uuid>",
    "title": "Title name of checklist",
    "items": [
        {
            "_id": "<uuid>",
            "text": "description beside checkbox"
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
            "checked": false
        }
    ]
}
```

# Indexes

**TODO**: for the planning of indexes / data structures, we aren't actually using any yet. We need to create a versioning scheme / init where we create / delete indexes etc.  

## Completed checklist instance

`['_id', 'completed']`