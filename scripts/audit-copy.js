const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const pattern = '\\[X\\]|(?i:PLACEHOLDER|Lake Como|\\bComo\\b|loveonlakecomo)';
const output = execFileSync('rg', ['--json', '--hidden', '--glob', '!preview/copy-audit.json', pattern, '.'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const groups = {};
for (const line of output.split('\n').filter(Boolean)) {
  const result = JSON.parse(line);
  if (result.type !== 'match') continue;
  const data = result.data;
  const file = data.path.text.replace(/^\.\//, '');
  const group = file.startsWith('node_modules/') ? 'dependencies'
    : file.startsWith('pictures ditesmoi/') ? 'supplied-source-archives'
    : file.startsWith('assets/vendor/') ? 'vendor'
    : /^(preview|reference)\//.test(file) ? 'generated-or-archived'
    : /^(index\.html|i18n\/|js\/|css\/)/.test(file) ? 'active-project'
    : 'tools-and-documentation';
  const entry = groups[group] ||= { matchingLines: 0, files: {}, matches: [] };
  entry.matchingLines++;
  entry.files[file] = (entry.files[file] || 0) + 1;
  // Do not copy bundled/archived website source into the report.
  if (['active-project', 'tools-and-documentation'].includes(group)) entry.matches.push({ file, line: data.line_number, text: data.lines.text.trim().slice(0, 260) });
}
const obsoletePhrases = [
  'Luxury Wedding Planner in France & Beyond',
  'Expertes en beaux évènements',
  'Your Wedding Planning Team',
  'Flawless Event Production',
  'Our wedding was perfect.',
  "Notre mariage était parfait, et je n'ai pas une seule remarque négative",
  'Say Yes to a Wedding Your Guests Will Never Forget',
  '[PLACEHOLDER testimonial', '[PLACEHOLDER: Wedding title]'
];
const files = ['index.html', ...fs.readdirSync('i18n').map(name => path.join('i18n', name)), ...fs.readdirSync('js').map(name => path.join('js', name))];
const obsoleteActiveCopy = files.flatMap(file => {
  const text = fs.readFileSync(file, 'utf8').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  return obsoletePhrases.filter(phrase => text.includes(phrase)).map(phrase => ({ file, phrase }));
});
const report = {
  scan: 'Whole workspace text search; binary files and this generated report excluded. Uppercase [X] is exact; other requested terms are case-insensitive.',
  groups, obsoleteActiveCopy,
  interpretation: [
    'Three English investment-range labels intentionally remain provisional; no approved ranges were supplied. French equivalents explicitly say they are to be defined.',
    'Active JavaScript also contains the pricing placeholder flag/comments and the native HTML placeholder attribute for the optional year. These are not leftover homepage claims.',
    'The old reference URL remains in the historical capture utility. It was not visited.',
    'Generated historical reports/comparisons, supplied downloaded website archives and third-party packages contain additional matches; file counts are listed separately.'
  ]
};
fs.writeFileSync('preview/copy-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ groups: Object.fromEntries(Object.entries(groups).map(([name, entry]) => [name, { matchingLines: entry.matchingLines, files: Object.keys(entry.files).length }])), obsoleteActiveCopy }, null, 2));
