'use strict';
const fs = require('node:fs');
const path = require('node:path');

function generateRaw(commit) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Provide the full 40-character asset commit SHA');
  const base = `https://raw.githubusercontent.com/TanTrieuNguyen/ff_client/${commit}/raw/`;
  const script = 'function onRequest(a,b){return b;}function onResponse(a,b,c){try{' +
    'if(b.path&&b.path.indexOf("/live")===0&&typeof c.body==="string"){' +
    'var o=JSON.parse(c.body);if(o&&typeof o==="object"&&!Array.isArray(o)&&' +
    'Object.prototype.hasOwnProperty.call(o,"abhotupdate_cdn_url")){' +
    'o.abhotupdate_cdn_url=' + JSON.stringify(base) + ';c.body=JSON.stringify(o);}}' +
    '}catch(e){}return c;}';
  return [{ enabled: true, name: 'GitHub Raw mirror - license unchanged', url: '.*', script }];
}
if (require.main === module) {
  const output = path.join(__dirname, 'proxypin-raw.json');
  fs.writeFileSync(output, JSON.stringify(generateRaw(process.argv[2] || ''), null, 2) + '\n');
  console.log(output);
}
module.exports = { generateRaw };