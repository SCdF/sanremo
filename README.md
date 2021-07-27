# Project Sanremo

Easy to use repeatable checklists in an offline first PWA webapp.

Hosted at: https://sanremo.sdufresne.info

## local setup

TODO: create a docker container for all this

### Postgres

TODO: automate

Postgres DB needs to be initialised:

```sh
psql < node_modules/connect-pg-simple/table.sql
psql < whatever is in src/server/sql
```

(command presumes default connection goes to the right place etc)

Also do everything in `/src/server/sql` in order
