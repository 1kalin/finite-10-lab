import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCatalog, publicListings } from '../lib/listing-model.mjs';

const fixture = JSON.parse(await readFile(new URL('../data/listings.v1.json', import.meta.url), 'utf8'));
assert.equal(parseCatalog(fixture).schemaVersion, 1);
assert.equal(publicListings(fixture).length, 1);
assert.equal(publicListings(fixture)[0].verification.state, 'unverified');
const invalid = structuredClone(fixture);
invalid.listings[0].destination.url = 'javascript:alert(1)';
assert.throws(() => parseCatalog(invalid), /must use https/);
const hidden = structuredClone(fixture);
hidden.listings[0].status = 'draft';
hidden.listings[0].visibility = 'private';
assert.deepEqual(publicListings(hidden), []);

const missingDisclosure = structuredClone(fixture);
delete missingDisclosure.listings[0].disclosure;
assert.throws(() => parseCatalog(missingDisclosure), /disclosure must be a non-empty string/);

const nonArrayEvidence = structuredClone(fixture);
nonArrayEvidence.listings[0].verification.evidence = 'fabricated';
assert.throws(() => parseCatalog(nonArrayEvidence), /evidence must be an array/);

const malformedEvidence = structuredClone(fixture);
malformedEvidence.listings[0].verification = {
  state: 'evidence_submitted',
  evidence: [{ type: 'owner-attestation', url: 'not-a-url', submittedAt: 'yesterday' }],
  checkedAt: null
};
assert.throws(() => parseCatalog(malformedEvidence), /evidence\[0\]\.url/);

const verifiedWithoutReview = structuredClone(fixture);
verifiedWithoutReview.listings[0].verification = {
  state: 'verified',
  evidence: [{ type: 'owner-attestation', url: 'https://example.com/evidence', submittedAt: '2026-08-25T00:00:00Z' }],
  checkedAt: null
};
assert.throws(() => parseCatalog(verifiedWithoutReview), /checkedAt must be a non-empty string/);

const unverifiedWithEvidence = structuredClone(fixture);
unverifiedWithEvidence.listings[0].verification.evidence = [
  { type: 'owner-attestation', url: 'https://example.com/evidence', submittedAt: '2026-08-25T00:00:00Z' }
];
assert.throws(() => parseCatalog(unverifiedWithEvidence), /evidence must be empty when unverified/);
console.log('listing model validation checks passed');
