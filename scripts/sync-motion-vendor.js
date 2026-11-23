const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'assets/vendor');
fs.mkdirSync(destination, { recursive: true });
for (const [from, to] of [
  ['gsap/dist/gsap.min.js', 'gsap.min.js'],
  ['gsap/dist/ScrollTrigger.min.js', 'ScrollTrigger.min.js'],
  ['gsap/dist/SplitText.min.js', 'SplitText.min.js'],
  ['lenis/dist/lenis.min.js', 'lenis.min.js'],
  ['lenis/dist/lenis.css', 'lenis.css'],
  ['lenis/LICENSE', 'LENIS-LICENSE.txt'],
  ['gsap/dist/gsap.min.js.map', 'gsap.min.js.map'],
  ['gsap/dist/ScrollTrigger.min.js.map', 'ScrollTrigger.min.js.map'],
  ['gsap/dist/SplitText.min.js.map', 'SplitText.min.js.map'],
  ['lenis/dist/lenis.min.js.map', 'lenis.min.js.map'],
]) {
  const source = path.join(root, 'node_modules', from);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(destination, to));
}
const versions = {};
// Preserve the exact Lenis rules while avoiding a separate render-blocking request.
const indexPath = path.join(root, 'index.html');
const index = fs.readFileSync(indexPath, 'utf8');
fs.writeFileSync(indexPath, index.replace(/<style id="lenis-style">[\s\S]*?<\/style>/, '<style id="lenis-style">' + fs.readFileSync(path.join(destination, 'lenis.css'), 'utf8') + '</style>'));
for (const name of ['gsap', 'lenis']) versions[name] = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'))).version;
fs.writeFileSync(path.join(destination, 'versions.json'), JSON.stringify(versions, null, 2) + '\n');
fs.writeFileSync(path.join(destination, 'NOTICE.txt'), 'GSAP: original copyright and Standard License notices are retained in each distributed file. See https://gsap.com/standard-license/.\nLenis: MIT license, reproduced in LENIS-LICENSE.txt.\n');
console.log('Synced motion libraries:', versions);
