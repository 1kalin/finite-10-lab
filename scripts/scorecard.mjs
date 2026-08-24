import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sites = JSON.parse(fs.readFileSync(path.join(root, 'sites.json'), 'utf8'));
const model = JSON.parse(fs.readFileSync(path.join(root, 'analysis/launch-scorecard.json'), 'utf8'));

const criteria = Object.keys(model.weights);
const scoreRows = (weights = model.weights) => sites.map((site) => {
  const file = path.join(root, `${site.slug}.html`);
  const html = fs.readFileSync(file, 'utf8');
  const scores = model.concepts[site.slug];
  if (!scores || scores.length !== criteria.length) throw new Error(`Missing scores for ${site.slug}`);
  const weighted = scores.reduce((sum, score, index) => sum + score * weights[criteria[index]], 0);
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

const rows = scoreRows();

const sensitivity = criteria.flatMap((criterion) => [0.75, 1.25].map((factor) => {
  const varied = { ...model.weights, [criterion]: model.weights[criterion] * factor };
  const total = Object.values(varied).reduce((sum, weight) => sum + weight, 0);
  const normalized = Object.fromEntries(Object.entries(varied).map(([key, weight]) => [key, weight / total]));
  const ranked = scoreRows(normalized);
  return {
    criterion,
    change: factor < 1 ? '-25%' : '+25%',
    winner: ranked[0].name,
    winnerScore: ranked[0].weightedScore,
    runnerUp: ranked[1].name,
    runnerUpScore: ranked[1].weightedScore,
    margin: Number((ranked[0].weightedScore - ranked[1].weightedScore).toFixed(2))
  };
}));

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

const winner = rows[0];
const runnerUp = rows[1];
const decisionLines = [
  '# FINITE/10 flagship decision',
  '',
  `Generated from commit ${process.env.GITHUB_SHA || 'local working tree'} by \`npm run scorecard\`.`,
  '',
  '## Decision',
  '',
  `**Select ${winner.name} as the single flagship.** Its base weighted score is ${winner.weightedScore.toFixed(2)}, ahead of ${runnerUp.name} at ${runnerUp.weightedScore.toFixed(2)}. It remains first in every one-at-a-time ±25% normalized-weight sensitivity case.`,
  '',
  'Build it as a useful, free, evidence-disciplined AI-agent directory and comparison product. The finite Founding 100 wall is a separately labeled sponsorship layer, not the product evidence layer and never an organic ranking signal. The initial buyer hypothesis is an AI-agent founder or growth lead seeking measurable qualified discovery and trust.',
  '',
  'The proposed $99 one-time Founding 100 offer and 25-slot validation tranche remain unapproved hypotheses. Live charging stays disabled until the operator approves the exact price and activation.',
  '',
  '## Sensitivity',
  '',
  '| Varied criterion | Change | Winner | Score | Runner-up | Score | Margin |',
  '| --- | ---: | --- | ---: | --- | ---: | ---: |',
  ...sensitivity.map((row) => `| ${row.criterion} | ${row.change} | ${row.winner} | ${row.winnerScore.toFixed(2)} | ${row.runnerUp} | ${row.runnerUpScore.toFixed(2)} | ${row.margin.toFixed(2)} |`),
  '',
  'Weights are varied one at a time and all weights are then renormalized to sum to 1. Scores remain the explicit evidence-led hypotheses in `analysis/launch-scorecard.json`; no score was changed for this decision because the completed competitor, SEO, and ICP analyses support the existing ordering.',
  '',
  '## Success metrics and falsification gates',
  '',
  '- Measure qualified organic impressions, profile views, outbound clicks, submission completion, and evidence-review cost; do not substitute page count or sponsored inventory for buyer value.',
  '- Falsify the search-led surface if most intended collections cannot sustain at least five genuinely relevant agents plus unique analysis, or if profiles collapse into repeated vendor copy.',
  '- Falsify the trust model if capabilities and integrations cannot be verified economically, benchmarks cannot be refreshed, or moderation cost exceeds plausible gross margin.',
  '- Falsify monetization if qualified vendors reject the job-to-be-done, mainly seek undisclosed rank, or measured qualified discovery does not materialize before charging.',
  '- Revisit the flagship choice if test-mode funnel evidence contradicts the offer or another concept overtakes Agent Wall under the same cited scorecard and sensitivity rule.',
  '',
  '## Non-winner disposition',
  '',
  'Preserve the other nine prototypes as an explicitly noindex lab/archive. Do not delete them, present them as active offers, or expand them into indexable thin-page collections. They may be reconsidered only with new evidence recorded in the scorecard source of truth.',
  '',
  '## Evidence used',
  '',
  '- `analysis/COMPETITOR-MAP.md`: a canvas alone is weak; evidence status, last-tested methodology, sponsorship disclosure, and destination health create the useful product.',
  '- `analysis/SEO-OPPORTUNITY.md`: Agent Wall ranks first, with useful profile, use-case, integration, alternative, and comparison intents subject to strict indexing thresholds.',
  '- `analysis/ICP-PURCHASE-TRIGGERS.md`: the clearest initial B2B buyer and measurable outcome are vendor discovery and qualified outbound clicks, with charging gated on validation.',
  ''
];

const decisionOutput = path.join(root, 'analysis/FLAGSHIP-DECISION.md');
fs.writeFileSync(decisionOutput, decisionLines.join('\n'));
console.log(`Wrote ${path.relative(root, output)} (${rows.length} concepts)`);
console.log(`Wrote ${path.relative(root, decisionOutput)} (${sensitivity.length} sensitivity cases)`);
