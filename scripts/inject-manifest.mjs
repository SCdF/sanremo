// To be run post-build, this correctly sets the manifest

import crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const getAllFiles = (dirPath, arrayOfFiles = []) => {
  const files = fs.readdirSync(dirPath);

  const allFiles = [];
  for (const file of files) {
    if (fs.statSync(`${dirPath}/${file}`).isDirectory()) {
      allFiles.push(...getAllFiles(`${dirPath}/${file}`, arrayOfFiles));
    } else {
      allFiles.push(path.join(dirPath, '/', file));
    }
  }

  return allFiles;
};

// Generate manifest list
const DIR = 'dist/client';
const SERVICE_WORKER = '/service-worker.js';
const buildFiles = getAllFiles(DIR).filter(
  (f) => !f.endsWith('.map') && !f.endsWith(SERVICE_WORKER),
);

const stringManifest = buildFiles.map((filename) => {
  const url = filename.split(DIR)[1];

  if (url.match(/\.[0-9a-f]{8}\.[^.]+$/)) {
    // File has .12345678.abc somewhere in it. we will presume this is Parcel's hash
    // eg. index.es.8f189f37.js

    return `{url: "${url}", revision: null}`;
  }

  // We have no hash, we need to hash it ourselves
  const file = fs.readFileSync(filename);
  const md5 = crypto.createHash('md5').update(file).digest('hex');
  return `{url: "${url}", revision: "${md5}"}`;
});

// Inject values
const sw = fs.readFileSync(path.join(DIR, SERVICE_WORKER)).toString();
const fixed = sw.replace(/("|')INJECT_MANIFEST_HERE("|')/, stringManifest.join(','));
fs.writeFileSync(path.join(DIR, SERVICE_WORKER), fixed);
