#/bin/sh
pnpm psql < node_modules/connect-pg-simple/table.sql
pnpm psql < src/server/sql/20210525\ init.sql
pnpm psql < src/server/sql/20210602\ json.sql
