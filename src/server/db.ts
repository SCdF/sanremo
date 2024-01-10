import pg from 'pg';

const ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;

export const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});
