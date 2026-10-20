'use strict';
const fs = require('node:fs');
const path = require('node:path');
function generate(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Provide only the HTTPS origin of your Render service');
  }
  const base = url.origin + '/_abhu/?p=/';
  const script = 'function onRequest(a,b){return b;}function onResponse(a,b,c){try{' +
    'if(b.path&&b.path.indexOf("/live")===0&&typeof c.body==="string"){' +
    'var o=JSON.parse(c.body);if(o&&typeof o==="object"&&!Array.isArray(o)&&' +
    'Object.prototype.hasOwnProperty.call(o,"abhotupdate_cdn_url")){' +
    'o.abhotupdate_cdn_url=' + JSON.stringify(base) + ';c.body=JSON.stringify(o);}}' +
    '}catch(e){}return c;}';
  return [{ enabled: true, name: 'Hot-update mirror (license unchanged)', url: '.*', script }];
}
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Usage: node generate-proxypin.cjs https://YOUR-SERVICE.onrender.com');
  const output = path.join(__dirname, 'proxypin.json');
  fs.writeFileSync(output, JSON.stringify(generate(process.argv[2]), null, 2));
  console.log(output);
}
module.exports = { generate };