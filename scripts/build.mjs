import { build } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const mode = process.argv.includes('--development') ? 'development' : 'production';
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/prepare-public-timetables.ts'], { stdio: 'inherit' });
await build({ mode });
await build({ mode, ssr: { noExternal: ['react-helmet-async'] }, build: { ssr: 'src/entry-server.tsx', outDir: '.tools/ssr', emptyOutDir: true,
  rollupOptions: { output: { entryFileNames: 'entry-server.mjs' } } } });
const { render, publicPaths, routePages, snapshotId, SITE_URL } = await import(pathToFileURL(resolve('.tools/ssr/entry-server.mjs')).href);
const template = await readFile('dist/index.html', 'utf8');
const outputs = [];
for (const path of [...publicPaths, '/404', '/search']) {
  const { head, body } = render(path);
  // Search queries are resolved in the browser; never hydrate a different query's HTML.
  const root = path === '/search' ? '<div id="root"></div><noscript>Interactive search requires JavaScript. Browse <a href="/routes">published route timetables</a> without JavaScript.</noscript>'
    : `<div id="root" data-rendered="true">${body}</div>`;
  const journey = routePages.find(journey => journey.path === path);
  // The current page alone hydrates from inline JSON; other journeys load on navigation.
  const data = journey ? `<script id="page-journey" type="application/json">${JSON.stringify(journey).replace(/</g, '\\u003c')}</script>` : '';
  const html = template.replace('<!--app-head-->', () => head).replace('<div id="root"></div>', () => root + data);
  const file = path === '/' ? 'dist/index.html' : `dist${path}.html`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  outputs.push({ path, file: file.replace('dist/', ''), indexable: publicPaths.includes(path) });
}
const escapeXml = value => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
const urls = [...new Set(outputs.filter(page => page.indexable).map(page => `${SITE_URL}${page.path}`))];
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
// Machine-readable build evidence consumed by regression checks; not a second timetable.
await writeFile('dist/generated-pages.json', JSON.stringify({ snapshotId, pages: outputs,
  journeys: routePages.map(({ path, fromId, toId, reason, services }) => ({ path, fromId, toId, reason, serviceIds: services.map(service => service.id) })) }, null, 2) + '\n');
console.log(`Generated ${publicPaths.length} indexable pages, search shell, 404 and sitemap.`);
