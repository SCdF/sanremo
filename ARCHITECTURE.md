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

```json
{
    "_id": "checklist:instance:<timestamp>",
    "created": 1234567890,
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