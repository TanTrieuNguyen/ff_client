'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function loadFiles(root) {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));
  const files = new Map();
  for (const entry of index.files) {
    const filename = path.resolve(root, entry.file);
    if (!filename.startsWith(path.resolve(root) + path.sep)) throw new Error('Invalid local path');
    const bytes = fs.readFileSync(filename);
    if (bytes.length !== entry.size || crypto.createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
      throw new Error('Integrity check failed: ' + entry.file);
    }
    if (files.has(entry.route)) throw new Error('Duplicate route');
    files.set(entry.route, { ...entry, filename });
  }
  return files;
}

function rangeFor(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) throw new Error('Invalid range');
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new Error('Invalid suffix');
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start || start >= size) {
      throw new Error('Invalid bounds');
    }
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

function createServer(root = path.join(__dirname, 'data')) {
  const files = loadFiles(root);
  return http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end();
    }
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); return res.end(); }
    if (url.pathname === '/healthz') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ ok: true, files: files.size, licenseModified: false }));
    }
    let route;
    try {
      if (url.pathname === '/_abhu/') route = url.searchParams.get('p');
      else if (url.pathname.startsWith('/hotupdate/')) route = decodeURIComponent(url.pathname.slice('/hotupdate'.length));
    } catch { res.writeHead(400); return res.end(); }
    const file = files.get(route);
    if (!file) { res.writeHead(404); return res.end('Not in captured manifest'); }
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    let range;
    try { range = rangeFor(req.headers.range, file.size); }
    catch { res.writeHead(416, { 'Content-Range': `bytes */${file.size}` }); return res.end(); }
    if (range) res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.size}`);
    res.setHeader('Content-Length', range ? range.end - range.start + 1 : file.size);
    res.writeHead(range ? 206 : 200);
    if (req.method === 'HEAD' || file.size === 0) return res.end();
    const stream = fs.createReadStream(file.filename, range || {});
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  });
}
if (require.main === module) {
  const server = createServer();
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Hot-update mirror listening'));
  process.on('SIGTERM', () => server.close());
}
module.exports = { createServer, rangeFor };