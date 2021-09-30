# Project Sanremo

Easy to use repeatable checklists in an offline first PWA.

Hosted at: https://sanremo.sdufresne.info

## Local Development

To dev without a server, you can just `npm ci` then `npm run dev`.

If you also want the backend server for user support you'll need to: install postgres; init the schema; then build and boot the server.

### Postgres+server

Installing postgres is left as an exercise to the reader. The `serverLocal` command connects to `postgres://$USER@localhost` by default.

Postgres DB needs to be initialised to support the connect-pg-simple schema as well as our own:

```sh
psql < node_modules/connect-pg-simple/table.sql
psql < 'whatever is in src/server/sql, in order'
```

(command presumes default connection goes to the right place etc)

Then the local server can be built with `npm run buildServer` (no continuous build here sorry) and started with either `npm run serverLocal` or `npm start` with custom `DATABASE_URL` and `PORT` environment variables. Note that if you change the `PORT` variable `npm run dev` will not proxy correctly without changing the `proxy` value in `package.json`.

## Building

The production build is achieved with `npm run build` and started with `npm start`
