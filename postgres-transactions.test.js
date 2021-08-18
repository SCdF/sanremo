import pg from 'pg';

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const slowTransaction = async (id) => {
  const log = (text) => console.log(id, text);

  log('connect');
  const client = await db.connect();
  try {
    log('begin');
    await client.query('BEGIN');

    log('insert');
    try {
      await client.query('insert into test_transactions (first,second) values ($1,$2)', [
        1,
        Math.random(),
      ]);
    } catch (e) {
      log('failure in insert');
      console.error(e);
    }

    log('timeout');
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    log('commit');
    try {
      await client.query('COMMIT');
    } catch (e) {
      log('failure in commit');
      console.error(e);
    }
  } catch (e) {
    log('total failure');
    console.error(e);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
};

(async () => {
  await db.query('drop table if exists test_transactions');
  await db.query('create table test_transactions (first integer, second real, primary key(first))');

  await Promise.all([slowTransaction(1), slowTransaction(2)]);

  await db.end();
})();
