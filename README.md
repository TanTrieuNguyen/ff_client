# Hot-update mirror for Render

**This is a mirror of the captured files, NOT an unlocked patch. License checks remain unchanged.**
The original download directory and license-test backups are not modified.

## Included
- 71 captured compressed resources for iOS 1.132.11 and a plain `fileinfo` manifest.
- Node.js server using built-in modules only; no npm dependencies.
- Exact-route allowlist, SHA-256 verification at startup, GET/HEAD and single byte-range support.
- ProxyPin generator matching the request pattern in the capture.
- No upstream forwarding, authentication emulation or license service.

## Local testing
From this project directory run `npm test`, then `npm start`.
The server listens on port 3000 unless `PORT` is set.
`http://localhost:3000/healthz` reports readiness.

## GitHub and Render
1. Create a dedicated repository for THIS directory, not the entire Downloads directory.
   Prefer a private repository; do not publish files you lack permission to distribute.
2. Upload this directory including `data/`, `render.yaml` and the Node scripts.
   Do not upload the original ProxyPin token, capture headers, analysis or backup directories.
3. Connect the repository in Render using a Blueprint (`render.yaml`), or create a Node Web Service:
   build command `npm test`, start command `npm start`, health-check path `/healthz`.
4. Confirm the assigned HTTPS service URL returns `ok: true` at `/healthz`.
5. Generate the ProxyPin JSON with your ACTUAL assigned URL:

   `node generate-proxypin.cjs https://YOUR-SERVICE.onrender.com`

   The argument above is an example: replace it with the hostname assigned by Render.
   Import the generated `proxypin.json` into ProxyPin.

The supplied `proxypin.json` is deliberately disabled and has no deployment address.
Running the generator replaces it with an enabled rule pointing at your actual service.
No Render deployment or GitHub upload has been performed by this project.

## Routes and limits
- `/_abhu/?p=/ios/1.132.11/fileinfo`
- `/_abhu/?p=/ios/1.132.11/gameassetbundles/<name>.<encoded-hash>`
- `/hotupdate/ios/1.132.11/...` also supports the same manifest/resource routes.

Hash suffixes retain the captured `~2B`, `~2F`, `~3D` encoding.
Compressed resource bytes are served unchanged without HTTP Content-Encoding.
Unknown paths return 404; this is not a mirror of all game versions or optional resources.
Other hosts and optional-resource requests are not redirected by the generated script.
The script changes `abhotupdate_cdn_url` only; any separate license API remains unchanged.
Free Render services may sleep and cold-start, causing game download timeouts.
Game cache may prevent requests from appearing until resources are requested again.