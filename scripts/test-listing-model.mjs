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
console.log('listing model validation checks passed');
