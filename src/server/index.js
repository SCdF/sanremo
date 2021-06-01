const express = require('express');
const path = require('path');
const app = express();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.urlencoded( {extended: true} ));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../..', 'build')));

const sess = {
  secret: process.env.NODE_ENV === 'production' ? process.env.SECRET : 'devsecret',
  name: 'sanremo',
  saveUninitialized: false,
  resave: true, // TODO: work out what we want this to be
  rolling: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 14 // two weeks
  }
};

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  sess.cookie.secure = true;
}

if (process.env.DATABASE_URL) {
  sess.store = new pgSession({pool: db});
}

app.use(session(sess));

app.post('/api/auth', async function(req, res) {
  const result = await db.query('select password from users where username = $1::text', [req.body.username]);

  if (result?.rows.length === 1) {
    const hash = result.rows[0].password;
    if (bcrypt.compareSync(req.body.password, hash)) {
      req.session.user = req.body.username;
      return res.json(req.session);
    }
  }

  res.status(401);
  res.end();
});

// API access (bar logging in) requires a valid cookie, but accessing anything else (see /* below) does not
app.all('/api/*', function(req, res, next) {
  if (!req.session.user) {
    res.status(403);
    return res.json({error: 'no authentication provided'});
  }

  next();
})

app.get('/api/auth', function(req, res) {
  return res.json(req.session);
});

app.get('/api/deployment', function (req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.json({
      deploy_created_at: process.env.HEROKU_RELEASE_CREATED_AT,
      deploy_version: process.env.HEROKU_RELEASE_VERSION,
      deploy_commit: process.env.HEROKU_SLUG_COMMIT,
      release_version: require('../../package.json').version,
    });
  }

  return res.json({
    deploy_created_at: '1970-01-01T12:12:12Z',
    deploy_version: 'continuous',
    deploy_commit: 'local HEAD',
    release_version: require('../../package.json').version,
  });
});

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, '../..', 'build', 'index.html'));
});

const port = process.env.PORT || 80;
app.listen(port);

console.log(`Started server on port ${port}`);
