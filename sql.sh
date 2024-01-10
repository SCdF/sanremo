#/bin/sh
yarn psql < node_modules/connect-pg-simple/table.sql
yarn psql < src/server/sql/20210525\ init.sql
yarn psql < src/server/sql/20210602\ json.sql
