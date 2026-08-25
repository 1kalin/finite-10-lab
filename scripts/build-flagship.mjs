import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { publicListings } from '../lib/listing-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function renderListing(listing) {
  const categories = listing.categories.map(category => `<span>${escapeHtml(category)}</span>`).join('');
  return `<article class="profile-card"><div class="profile-meta"><span>${escapeHtml(listing.disclosure)}</span><span>${escapeHtml(listing.verification.state)}</span></div><h3>${escapeHtml(listing.name)}</h3><p>${escapeHtml(listing.summary)}</p><div class="profile-categories">${categories}</div><a href="${escapeHtml(listing.destination.url)}" rel="noopener noreferrer">${escapeHtml(listing.destination.label)}</a></article>`;
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const source = await readFile(path.join(root, 'agent-wall.html'), 'utf8');
const catalog = JSON.parse(await readFile(path.join(root, 'data/listings.v1.json'), 'utf8'));
const cards = publicListings(catalog).map(renderListing).join('');
const directory = `<section class="directory-section" aria-labelledby="directory-title"><div><div class="eyebrow">Directory preview</div><h2 id="directory-title">Example profile format</h2></div><div class="profile-grid">${cards}</div></section>`;
const policyFooter = `<footer class="site-footer"><p>Agent Wall is a prototype. Listings, checkout, payments, and reservations are not live.</p><nav aria-label="Policies"><a href="policies.html#terms">Terms</a><a href="policies.html#privacy">Privacy</a><a href="policies.html#standards">Listing standards</a><a href="policies.html#refunds">Refunds &amp; cancellation</a><a href="policies.html#moderation">Moderation &amp; takedown</a><a href="policies.html#contact">Contact</a></nav></footer>`;
const branded = source
  .replace('<a class="brand" href="index.html">FINITE/10</a>', '<span class="brand">Agent Wall</span>')
  .replace('<title>The Agent Wall</title>', '<title>Agent Wall — AI agent directory</title>')
  .replace('</head>', '<link rel="stylesheet" href="mobile.css"><link rel="stylesheet" href="positioning.css"></head>')
  .replace('<section class="trust-section"', `${directory}<section class="trust-section"`)
  .replace('<script>window.SITE_CONFIG', `${policyFooter}<script>window.SITE_CONFIG`);

await writeFile(path.join(output, 'index.html'), branded);
await cp(path.join(root, 'styles.css'), path.join(output, 'styles.css'));
await cp(path.join(root, 'mobile.css'), path.join(output, 'mobile.css'));
await cp(path.join(root, 'positioning.css'), path.join(output, 'positioning.css'));
await cp(path.join(root, 'app.js'), path.join(output, 'app.js'));
await cp(path.join(root, 'policies.html'), path.join(output, 'policies.html'));
