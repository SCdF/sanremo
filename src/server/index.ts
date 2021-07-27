import { readFileSync } from 'fs';
import express from 'express';
import session from 'express-session';
import { SessionOptions } from 'express-session';
import bcrypt from 'bcryptjs';

import pgConnect from 'connect-pg-simple';

import syncRoutes from './sync/routes';
import { db } from './db';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('build'));

if (process.env.NODE_ENV === 'production' && !process.env.SECRET) {
  console.error('Production deployment but no SECRET defined!');
  process.exit(-1);
}
const secret = (
  process.env.NODE_ENV === 'production' ? process.env.SECRET : 'devsecret'
) as string;

const pgSession = pgConnect(session);
const sess: SessionOptions = {
  secret: secret,
  name: 'sanremo',
  saveUninitialized: false,
  resave: true, // TODO: work out what we want this to be
  rolling: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 14, // two weeks
  },
};

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  sess.cookie!.secure = true;
}

if (process.env.DATABASE_URL) {
  sess.store = new pgSession({ pool: db });
}

app.use(session(sess));

app.post('/api/auth', async function (req, res) {
  const { username, password } = req.body;
  const result = await db.query(
    'select id, password from users where username = $1::text',
    [username]
  );

  if (result?.rows.length === 1) {
    const id = result.rows[0].id;
    const hash = result.rows[0].password;
    if (bcrypt.compareSync(password, hash)) {
      req.session.user = { id: id, name: username };
      return res.json(req.session);
    }
  }

  res.status(401);
  res.end();
});

// API access (bar logging in) requires a valid cookie, but accessing anything else (see /* below) does not
app.all('/api/*', function (req, res, next) {
  if (!req.session.user) {
    res.status(403);
    return res.json({ error: 'no authentication provided' });
  }

  next();
});

app.get('/api/auth', function (req, res) {
  return res.json(req.session);
});

app.get('/api/deployment', function (req, res) {
  const releaseVersion = JSON.parse(
    readFileSync(
      new URL('../../package.json', import.meta.url).pathname,
      'utf-8'
    )
  ).version;

  if (process.env.NODE_ENV === 'production') {
    return res.json({
      deploy_created_at: process.env.HEROKU_RELEASE_CREATED_AT,
      deploy_version: process.env.HEROKU_RELEASE_VERSION,
      deploy_commit: process.env.HEROKU_SLUG_COMMIT,
      release_version: releaseVersion,
    });
  }

  return res.json({
    deploy_created_at: '1970-01-01T12:12:12Z',
    deploy_version: 'continuous',
    deploy_commit: 'local HEAD',
    release_version: releaseVersion,
  });
});

syncRoutes(app);

app.get('/*', function (req, res) {
  const index = new URL('../../build/index.html', import.meta.url).pathname;
  res.sendFile(index);
});

const port = process.env.PORT || 80;
app.listen(port);

console.log(`Started server on port ${port}`);
