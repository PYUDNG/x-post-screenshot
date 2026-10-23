import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = String(packageJson.version);
const githubFile = resolve(dist, 'x-post-screenshot.user.js');
const greasyforkFile = resolve(dist, 'x-post-screenshot.greasyfork.user.js');
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function metadata(source) {
  return source.slice(source.indexOf('// ==UserScript=='), source.indexOf('// ==/UserScript=='));
}

function hasMeta(meta, key) {
  return new RegExp(`^// @${key}(?:\\s|$)`, 'm').test(meta);
}

function metaValue(meta, key) {
  return meta.match(new RegExp(`^// @${key}\\s+(.+)$`, 'm'))?.[1]?.trim() ?? '';
}

for (const path of [githubFile, greasyforkFile]) {
  if (!existsSync(path)) {
    fail(`missing build artifact: ${path}`);
    continue;
  }
  const stat = readFileSync(path);
  if (stat.byteLength >= 2_000_000) {
    fail(`${basename(path)} is ${stat.byteLength} bytes (limit: 2 MB)`);
  }
}

if (errors.length === 0) {
  const github = read(githubFile);
  const greasyfork = read(greasyforkFile);
  const githubMeta = metadata(github);
  const greasyforkMeta = metadata(greasyfork);

  for (const [name, meta] of [
    ['github', githubMeta],
    ['greasyfork', greasyforkMeta],
  ]) {
    if (metaValue(meta, 'version') !== version) {
      fail(`${name} @version does not match package.json (${version})`);
    }
    for (const key of [
      'GM_xmlhttpRequest',
      'GM_getValue',
      'GM_setValue',
      'GM_registerMenuCommand',
      'GM_setClipboard',
      'GM_download',
    ]) {
      if (!new RegExp(`^// @grant\\s+${key}$`, 'm').test(meta)) {
        fail(`${name} is missing @grant ${key}`);
      }
    }
    for (const match of [
      'https://x.com/*',
      'https://www.x.com/*',
      'https://mobile.x.com/*',
      'https://twitter.com/*',
      'https://www.twitter.com/*',
      'https://mobile.twitter.com/*',
    ]) {
      if (!meta.includes(`@match              ${match}`) && !meta.includes(`@match ${match}`)) {
        fail(`${name} is missing @match ${match}`);
      }
    }
    if (
      !meta.includes('@connect            *.twimg.com') &&
      !meta.includes('@connect *.twimg.com')
    ) {
      fail(`${name} is missing @connect *.twimg.com`);
    }
    if (!meta.includes('@connect            *.pscp.tv') && !meta.includes('@connect *.pscp.tv')) {
      fail(`${name} is missing @connect *.pscp.tv`);
    }
    if (/^\/\/ @connect\s+\*\s*$/m.test(meta)) {
      fail(`${name} must not request @connect *`);
    }
    if (hasMeta(meta, 'require')) {
      fail(`${name} must not use @require`);
    }
    if (
      !meta.includes('@run-at             document-start') &&
      !meta.includes('@run-at document-start')
    ) {
      fail(`${name} must run at document-start`);
    }
    if (!meta.includes('@noframes')) {
      fail(`${name} must use @noframes`);
    }
  }

  if (
    !/@updateURL\s+https:\/\/github\.com\/PY-DNG\/x-post-screenshot\/releases\/latest\/download\/x-post-screenshot\.user\.js/.test(
      githubMeta,
    )
  ) {
    fail('github build is missing the release @updateURL');
  }
  if (
    !/@downloadURL\s+https:\/\/github\.com\/PY-DNG\/x-post-screenshot\/releases\/latest\/download\/x-post-screenshot\.user\.js/.test(
      githubMeta,
    )
  ) {
    fail('github build is missing the release @downloadURL');
  }
  if (hasMeta(greasyforkMeta, 'updateURL') || hasMeta(greasyforkMeta, 'downloadURL')) {
    fail('greasyfork build must not include GitHub update/download URLs');
  }
  if (!greasyfork.includes('xpsFetch(')) {
    fail('greasyfork build does not contain the injected xpsFetch runtime');
  }
  if (!greasyfork.includes('html-to-image 1.11.13')) {
    fail('greasyfork build is missing the html-to-image source/license banner');
  }
  if (!github.includes('html-to-image 1.11.13')) {
    fail('github build is missing the html-to-image source/license banner');
  }
  if (!greasyfork.includes('async function fetchAsDataURL')) {
    fail('greasyfork build appears to be minified');
  }
  for (const [name, source] of [
    ['github', github],
    ['greasyfork', greasyfork],
  ]) {
    for (const forbidden of [
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'new Function',
      'eval(',
      'window.fetch',
      'XMLHttpRequest',
      'navigator.sendBeacon',
      'new WebSocket',
    ]) {
      if (source.includes(forbidden)) {
        fail(`${name} contains forbidden page API usage: ${forbidden}`);
      }
    }
    if (/(?:^|[^A-Za-z0-9_])fetch\s*\(/.test(source)) {
      fail(`${name} contains a direct global fetch call`);
    }
  }
}

if (errors.length > 0) {
  console.error('Build verification failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const files = [
  githubFile,
  resolve(dist, 'x-post-screenshot.meta.js'),
  greasyforkFile,
  resolve(dist, 'x-post-screenshot.greasyfork.meta.js'),
].filter((path) => existsSync(path));

const lines = [];
for (const path of files) {
  const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
  lines.push(`${hash}  ${basename(path)}`);
}
writeFileSync(resolve(dist, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`);

for (const path of files) {
  const bytes = readFileSync(path).byteLength;
  console.log(`${basename(path).padEnd(44)} ${String(bytes).padStart(8)} bytes`);
}
console.log('Build verification passed.');
