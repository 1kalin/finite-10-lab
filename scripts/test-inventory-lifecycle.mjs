import assert from 'node:assert/strict';
import { InventoryLedger } from '../lib/inventory-lifecycle.mjs';

let clock = new Date('2026-08-25T02:00:00Z');
const ledger = new InventoryLedger([
  { id: 'tile-1', state: 'available' },
  { id: 'tile-2', state: 'available' }
], { now: () => clock });

const reservation = await ledger.reserve({ itemId: 'tile-1', requestId: 'reserve-1', holderId: 'owner-1', holdUntil: '2026-08-25T02:10:00Z' });
assert.deepEqual(await ledger.reserve({ itemId: 'tile-1', requestId: 'reserve-1', holderId: 'owner-1', holdUntil: '2026-08-25T02:10:00Z' }), reservation);
assert.equal(ledger.snapshot().events.length, 1);
const attempts = await Promise.allSettled([
  ledger.claim({ itemId: 'tile-1', requestId: 'claim-1', holderId: 'owner-1' }),
  ledger.claim({ itemId: 'tile-1', requestId: 'claim-2', holderId: 'owner-1' })
]);
assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
assert.equal(ledger.publicCounts().claimed, 1);

await ledger.reserve({ itemId: 'tile-2', requestId: 'reserve-2', holderId: 'owner-2', holdUntil: '2026-08-25T02:05:00Z' });
clock = new Date('2026-08-25T02:06:00Z');
assert.deepEqual(ledger.publicCounts(), { available: 0, held: 0, claimed: 1, expired: 1, removed: 0 });
const before = ledger.snapshot().events;
await ledger.remove({ itemId: 'tile-2', requestId: 'remove-1', reason: 'moderation decision' });
const after = ledger.snapshot().events;
assert.deepEqual(after.slice(0, before.length), before);
assert.equal(ledger.publicCounts().removed, 1);
await assert.rejects(ledger.reserve({ itemId: 'tile-1', requestId: 'reserve-1', holderId: 'other', holdUntil: '2026-08-25T03:00:00Z' }), /different mutation/);
await assert.rejects(ledger.claim({ itemId: 'tile-2', requestId: 'claim-1', holderId: 'owner-2' }), /different mutation/);
await assert.rejects(ledger.remove({ itemId: 'tile-1', requestId: 'remove-1', reason: 'moderation decision' }), /different mutation/);
await assert.rejects(ledger.remove({ itemId: 'tile-2', requestId: 'remove-1', reason: 'different reason' }), /different mutation/);
console.log('inventory lifecycle checks passed');
