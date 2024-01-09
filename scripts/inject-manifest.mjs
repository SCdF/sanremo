// To be run post-build, this correctly sets the manifest

import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const getAllFiles = (dirPath, arrayOfFiles = []) => {
  const files = fs.readdirSync(dirPath);

  const allFiles = [];
  for (const file of files) {
    if (fs.statSync(`${dirPath}/${file}`).isDirectory()) {
      allFiles.concat(getAllFiles(`${dirPath}/${file}`, arrayOfFiles));
    } else {
      allFiles.push(path.join(dirPath, '/', file));
    }
  }

  return allFiles;
};

// Generate manifest list
const DIR = 'dist/frontend';
const SERVICE_WORKER = '/service-worker.js';
const INDEX = '/index.html';
const buildFiles = getAllFiles(DIR)
  .filter((f) => !f.endsWith('.map') && !f.endsWith(SERVICE_WORKER))
  .map((f) => f.split(DIR)[1]);

// Generate index hash
const sw = fs.readFileSync(path.join(DIR, SERVICE_WORKER)).toString();
const indexFile = fs.readFileSync(path.join(DIR, INDEX));
const indexHash = crypto.createHash('md5').update(indexFile).digest('hex');

// Inject values
const INJECT_MANIFEST = 'INJECT_MANIFEST_HERE';
const INJECT_INDEX_VERSION = 'INJECT_HTML_HASH_HERE';

const manifestStringedArray = buildFiles.map((f) => `"${f}"`).join(',');

const fixed = sw
  .replace(RegExp(`("|')${INJECT_MANIFEST}("|')`), manifestStringedArray)
  .replace(INJECT_INDEX_VERSION, indexHash);

fs.writeFileSync(path.join(DIR, SERVICE_WORKER), fixed);
