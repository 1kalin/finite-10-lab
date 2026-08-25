const STATUSES = new Set(['draft', 'pending_review', 'published', 'rejected', 'removed']);
const VISIBILITIES = new Set(['private', 'unlisted', 'public']);
const VERIFICATION_STATES = new Set(['unverified', 'evidence_submitted', 'verified', 'expired']);

function requireString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${path} must be a non-empty string`);
}

function requireUrl(value, path) {
  requireString(value, path);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${path} must be a valid URL`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${path} must use https`);
}

function requireTimestamp(value, path) {
  requireString(value, path);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${path} must be an ISO timestamp`);
}

function validateVerification(verification, path) {
  if (!verification || !VERIFICATION_STATES.has(verification.state)) throw new Error(`${path}.state is invalid`);
  if (!Array.isArray(verification.evidence)) throw new Error(`${path}.evidence must be an array`);
  verification.evidence.forEach((entry, index) => {
    const evidencePath = `${path}.evidence[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`${evidencePath} must be an object`);
    requireString(entry.type, `${evidencePath}.type`);
    requireUrl(entry.url, `${evidencePath}.url`);
    requireTimestamp(entry.submittedAt, `${evidencePath}.submittedAt`);
  });
  if (verification.state === 'unverified') {
    if (verification.evidence.length !== 0) throw new Error(`${path}.evidence must be empty when unverified`);
    if (verification.checkedAt !== null) throw new Error(`${path}.checkedAt must be null when unverified`);
    return;
  }
  if (verification.evidence.length === 0) throw new Error(`${path}.evidence must not be empty for ${verification.state}`);
  if (verification.state === 'evidence_submitted') {
    if (verification.checkedAt !== null) throw new Error(`${path}.checkedAt must be null while evidence is pending`);
    return;
  }
  requireTimestamp(verification.checkedAt, `${path}.checkedAt`);
}

function validateListing(listing, index) {
  const path = `listings[${index}]`;
  for (const field of ['id', 'slug', 'name', 'summary', 'description', 'disclosure']) requireString(listing[field], `${path}.${field}`);
  requireTimestamp(listing.createdAt, `${path}.createdAt`);
  requireTimestamp(listing.updatedAt, `${path}.updatedAt`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(listing.slug)) throw new Error(`${path}.slug is invalid`);
  if (!STATUSES.has(listing.status)) throw new Error(`${path}.status is invalid`);
  if (!VISIBILITIES.has(listing.visibility)) throw new Error(`${path}.visibility is invalid`);
  requireString(listing.owner && listing.owner.id, `${path}.owner.id`);
  requireString(listing.owner && listing.owner.displayName, `${path}.owner.displayName`);
  requireUrl(listing.destination && listing.destination.url, `${path}.destination.url`);
  requireString(listing.destination && listing.destination.label, `${path}.destination.label`);
  if (!Array.isArray(listing.categories) || listing.categories.length === 0) throw new Error(`${path}.categories must not be empty`);
  listing.categories.forEach((category, categoryIndex) => requireString(category, `${path}.categories[${categoryIndex}]`));
  validateVerification(listing.verification, `${path}.verification`);
  if (!Array.isArray(listing.editHistory) || listing.editHistory.length === 0) throw new Error(`${path}.editHistory must not be empty`);
  listing.editHistory.forEach((edit, editIndex) => {
    requireTimestamp(edit.at, `${path}.editHistory[${editIndex}].at`);
    requireString(edit.actor, `${path}.editHistory[${editIndex}].actor`);
    requireString(edit.summary, `${path}.editHistory[${editIndex}].summary`);
  });
  if (listing.status === 'published' && listing.visibility !== 'public') throw new Error(`${path} published listings must be public`);
}

export function parseCatalog(value) {
  if (!value || value.schemaVersion !== 1) throw new Error('catalog schemaVersion must be 1');
  if (!Array.isArray(value.listings)) throw new Error('catalog listings must be an array');
  const ids = new Set();
  const slugs = new Set();
  value.listings.forEach((listing, index) => {
    validateListing(listing, index);
    if (ids.has(listing.id)) throw new Error(`duplicate listing id: ${listing.id}`);
    if (slugs.has(listing.slug)) throw new Error(`duplicate listing slug: ${listing.slug}`);
    ids.add(listing.id);
    slugs.add(listing.slug);
  });
  return value;
}

export function publicListings(catalog) {
  return parseCatalog(catalog).listings.filter(listing => listing.status === 'published' && listing.visibility === 'public');
}
