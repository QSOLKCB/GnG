'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = match[1];
  if (/^https:\/\//.test(url)) { assert.ok(match[0].startsWith('href='), 'Runtime must not load an external resource'); continue; }
  assert.ok(!url.startsWith('/'), `Root-relative resource breaks project Pages: ${url}`);
  assert.ok(fs.existsSync(path.join(root, url)), `Missing resource: ${url}`);
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate DOM ID');
for (const file of fs.readdirSync(path.join(root, 'js'))) {
  const source = fs.readFileSync(path.join(root, 'js', file), 'utf8');
  new vm.Script(source, { filename: file });
  assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|importScripts)\s*\(/.test(source), `Unexpected runtime network API in ${file}`);
  if (file === 'app.js') for (const m of source.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(m[1]), `Missing UI element ${m[1]}`);
}
for (const required of ['.nojekyll', 'LICENSE', 'NOTICE']) assert.ok(fs.existsSync(path.join(root, required)));
console.log('Runtime syntax, relative resources, DOM references and offline dependency checks passed.');
