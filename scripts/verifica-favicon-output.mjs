import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '_site';
const required = [
  'favicon.ico',
  'favicon.svg',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'maskable-icon-512x512.png',
  'safari-pinned-tab.svg',
  'site.webmanifest',
  'browserconfig.xml',
];

const errors = [];
for (const file of required) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) errors.push(`manca ${p}`);
  else if (!fs.statSync(p).size) errors.push(`file vuoto ${p}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const indexPath = path.join(root, 'index.html');
if (!fs.existsSync(indexPath)) {
  errors.push(`manca ${indexPath}`);
} else {
  const html = fs.readFileSync(indexPath, 'utf8');
  const needles = [
    'href="/favicon.ico"',
    'href="/favicon.svg"',
    'href="/favicon-32x32.png"',
    'href="/favicon-16x16.png"',
    'href="/apple-touch-icon.png"',
    'href="/safari-pinned-tab.svg"',
    'href="/site.webmanifest"',
    'content="/browserconfig.xml"',
  ];
  for (const needle of needles) {
    if (!html.includes(needle)) errors.push(`index.html non contiene ${needle}`);
  }
}

if (!fs.existsSync(path.join(root, 'feed.xml'))) errors.push('manca feed.xml');

const htmlFiles = fs.existsSync(root)
  ? walk(root).filter((file) => file.toLowerCase().endsWith('.html'))
  : [];
const rssDiscovery = /<link\b(?=[^>]*\brel=["'][^"']*\balternate\b)(?=[^>]*\btype=["']application\/rss\+xml["'])(?=[^>]*\bhref=["']\/feed\.xml["'])[^>]*>/gi;
const visibleRssLink = /<a\b[^>]*\bhref=["']\/feed\.xml["'][^>]*>[\s\S]*?RSS[\s\S]*?<\/a>/i;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  const discoveries = head.match(rssDiscovery) || [];
  if (discoveries.length !== 1) {
    errors.push(`${path.relative(root, file)}: discovery RSS atteso una volta, trovato ${discoveries.length}`);
  }
  if (visibleRssLink.test(html)) errors.push(`${path.relative(root, file)}: link RSS visibile ancora presente`);
}

if (htmlFiles.some((file) => /(^|[\\/])rss(?:[\\/]|\.html$)/i.test(path.relative(root, file)))) {
  errors.push('pagina /rss/ non prevista presente nell output');
}

try {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'site.webmanifest'), 'utf8'));
  if (manifest.theme_color !== '#000E1A') errors.push('theme_color manifest inatteso');
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 3) errors.push('icone manifest incomplete');
} catch (err) {
  errors.push(`manifest non valido: ${err.message}`);
}

if (errors.length) {
  console.error('[favicon:verify] FAIL');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`[favicon:verify] OK — ${required.length} asset fondamentali, riferimenti globali e policy RSS verificati in ${root}/`);
