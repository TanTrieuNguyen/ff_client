'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function prepare(root = __dirname) {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'data/index.json'), 'utf8'));
  const entries = [];
  for (const item of index.files) {
    if (!item.route.startsWith('/ios/1.132.11/') || item.route.split('/').includes('..')) {
      throw new Error('Unexpected route: ' + item.route);
    }
    const source = path.resolve(root, 'data', item.file);
    if (!source.startsWith(path.resolve(root, 'data') + path.sep)) throw new Error('Unsafe source');
    const bytes = fs.readFileSync(source);
    if (bytes.length !== item.size || crypto.createHash('sha256').update(bytes).digest('hex') !== item.sha256) {
      throw new Error('Integrity mismatch: ' + item.file);
    }
    const destination = path.join(root, 'raw', item.route.slice(1));
    entries.push({ destination, bytes });
  }
  for (const { destination, bytes } of entries) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
  }
  return entries.length;
}
if (require.main === module) console.log('Prepared static paths:', prepare());
module.exports = { prepare };