const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '../..', 'build')));

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
