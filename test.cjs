'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createServer, rangeFor } = require('./server.cjs');
const { generate } = require('./generate-proxypin.cjs');

test('range bounds', () => {
  assert.deepEqual(rangeFor('bytes=0-', 10), { start: 0, end: 9 });
  assert.deepEqual(rangeFor('bytes=2-4', 10), { start: 2, end: 4 });
  assert.deepEqual(rangeFor('bytes=-3', 10), { start: 7, end: 9 });
  assert.deepEqual(rangeFor('bytes=0-999', 10), { start: 0, end: 9 });
  for (const value of ['bytes=10-', 'bytes=4-2', 'bytes=-0', 'bytes=0-1,3-4', 'bad']) {
    assert.throws(() => rangeFor(value, 10));
  }
});

test('ProxyPin only rewrites the configuration field', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(generate('https://mirror.example')[0].script, context);
  const body = JSON.stringify({ abhotupdate_cdn_url: 'old', another: 42 });
  const changed = context.onResponse({}, { path: '/live/config' }, { body });
  assert.deepEqual(JSON.parse(changed.body), { abhotupdate_cdn_url: 'https://mirror.example/_abhu/?p=/', another: 42 });
  for (const [requestPath, text] of [['/other', body], ['/live/x', 'invalid'], ['/live/x', '{"another":1}']]) {
    assert.equal(context.onResponse({}, { path: requestPath }, { body: text }).body, text);
  }
  assert.throws(() => generate('http://mirror.example'));
  assert.throws(() => generate('https://mirror.example/path'));
});

test('all captured resources, hashes, ranges and errors', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const index = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/index.json')));
    for (const entry of index.files) {
      const response = await fetch(origin + '/_abhu/?p=' + encodeURIComponent(entry.route));
      assert.equal(response.status, 200, entry.route);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(bytes.length, entry.size);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    }
    const patch = index.files.find(x => x.route.includes('assembly-csharp-patch.'));
    const url = origin + '/_abhu/?p=' + encodeURIComponent(patch.route);
    const partial = await fetch(url, { headers: { Range: 'bytes=0-15' } });
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), `bytes 0-15/${patch.size}`);
    assert.deepEqual(Buffer.from(await partial.arrayBuffer()), fs.readFileSync(path.join(__dirname, 'data', patch.file)).subarray(0, 16));
    const head = await fetch(url, { method: 'HEAD' });
    assert.equal(head.headers.get('content-length'), String(patch.size));
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    assert.equal((await fetch(url, { headers: { Range: 'bytes=999999999-' } })).status, 416);
    assert.equal((await fetch(origin + '/_abhu/?p=/../../server.cjs')).status, 404);
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
    assert.equal((await (await fetch(origin + '/healthz')).json()).licenseModified, false);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});