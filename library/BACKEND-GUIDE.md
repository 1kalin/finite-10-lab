# Backend Guide

## Data boundary

Agent Wall currently uses a build-time JSON catalog rather than a runtime database. All catalog input passes through `lib/listing-model.mjs`; rendering code must use `publicListings()` and must not read unvalidated records directly.

## Versioning and lifecycle

- Catalog files declare an integer `schemaVersion`. Version 1 is authoritative until a documented migration and compatible parser are shipped.
- Listing IDs and slugs are unique and stable. Status and visibility are separate, explicit fields.
- Published records must be public. Other lifecycle or visibility states never enter the public build.
- Edit history is append-only evidence. Verification is not a synonym for payment, placement, or endorsement.

## Validation

Validation fails closed on missing identity, owner, destination, categories, lifecycle fields, verification, or edit history. Public destinations must use HTTPS. Add adversarial cases to `scripts/test-listing-model.mjs` whenever the contract changes.
