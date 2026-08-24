import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sites = JSON.parse(fs.readFileSync(path.join(root, 'sites.json'), 'utf8'));
const model = JSON.parse(fs.readFileSync(path.join(root, 'analysis/launch-scorecard.json'), 'utf8'));

const criteria = Object.keys(model.weights);
const rows = sites.map((site) => {
  const file = path.join(root, `${site.slug}.html`);
  const html = fs.readFileSync(file, 'utf8');
  const scores = model.concepts[site.slug];
  if (!scores || scores.length !== criteria.length) throw new Error(`Missing scores for ${site.slug}`);
  const weighted = scores.reduce((sum, score, index) => sum + score * model.weights[criteria[index]], 0);
  return {
    slug: site.slug,
    name: site.name,
    prototypeBytes: fs.statSync(file).size,
    links: (html.match(/<a\b/gi) || []).length,
    buttons: (html.match(/<button\b/gi) || []).length,
    listedPriceUsd: site.price,
    weightedScore: Number(weighted.toFixed(2)),
    scores
  };
}).sort((a, b) => b.weightedScore - a.weightedScore || a.slug.localeCompare(b.slug));

const header = ['Rank', 'Concept', 'Bytes', 'Links', 'Buttons', 'List price*', ...criteria, 'Weighted'];
const lines = [
  '# FINITE/10 baseline and launch scorecard',
  '',
  `Generated from commit ${process.env.GITHUB_SHA || 'local working tree'} by \`npm run scorecard\`.`,
  '',
  '| ' + header.join(' | ') + ' |',
  '| ' + header.map(() => '---').join(' | ') + ' |',
  ...rows.map((row, index) => '| ' + [index + 1, row.name, row.prototypeBytes, row.links, row.buttons, `$${row.listedPriceUsd}`, ...row.scores, row.weightedScore.toFixed(2)].join(' | ') + ' |'),
  '',
  '\* List price is prototype configuration, not evidence of willingness to pay or revenue.',
  '',
  '## Method',
  '',
  model.rubric,
  '',
  `Weights: ${criteria.map((key) => `${key} ${(model.weights[key] * 100).toFixed(0)}%`).join('; ')}.`,
  '',
  'Repository measurements (bytes, links, buttons, configured price) are computed from the checked-in prototypes. Criterion scores are explicit hypotheses stored in `analysis/launch-scorecard.json`; they must be revised when competitor, SEO, and ICP tickets add evidence. No traffic, customer, conversion, payment, or revenue claim is inferred.',
  '',
  '## Decision rule',
  '',
  'Select one flagship only after the evidence tickets are complete. The leader must remain first when each individual weight is varied by ±25% and weights are renormalized. Falsify a candidate if qualified buyer interviews reject the job-to-be-done, compliant indexable page depth is too shallow, moderation cannot be operated safely, or test-mode funnel evidence contradicts the monetization hypothesis.',
  ''
];

const output = path.join(root, 'analysis/BASELINE-SCORECARD.md');
fs.writeFileSync(output, lines.join('\n'));
console.log(`Wrote ${path.relative(root, output)} (${rows.length} concepts)`);
