'use strict';
// Copy only the static runtime. No bundler, install, or external assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '_site');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of ['index.html', 'styles.css', '.nojekyll', 'js', 'assets', 'LICENSE', 'NOTICE']) {
  fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
}
console.log('Static runtime staged in _site/');
