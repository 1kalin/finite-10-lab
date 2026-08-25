import assert from 'node:assert/strict';
import { ModerationWorkflow, validateSubmission } from '../lib/moderation-workflow.mjs';

const now = () => new Date('2026-08-25T02:00:00Z');
let sequence = 0;
const workflow = new ModerationWorkflow({ now, id: prefix => `${prefix}-${++sequence}` });
const valid = {
  name: 'Useful Agent', summary: 'A useful agent.', description: 'Evidence-backed details.', ownerId: 'owner-1',
  destinationUrl: 'https://example.com/agent', categories: ['research'],
  evidence: [{ type: 'owner-attestation', url: 'https://example.com/evidence', submittedAt: '2026-08-25T01:00:00Z' }]
};

for (const url of ['javascript:alert(1)', 'http://example.com', 'https://localhost/x', 'https://127.0.0.1/x', 'https://10.0.0.1/x', 'https://user:pass@example.com']) {
  assert.throws(() => validateSubmission({ ...valid, destinationUrl: url }), /URL|https|private host/);
}
assert.throws(() => validateSubmission({ ...valid, evidence: [] }), /evidence/);
assert.throws(() => validateSubmission({ ...valid, categories: [''] }), /categories/);

const submitted = workflow.submit(valid, 'owner-1');
assert.equal(submitted.status, 'pending_review');
assert.throws(() => workflow.edit(submitted.id, { summary: 'Hijacked' }, 'attacker'), /only the owner/);
assert.throws(() => workflow.reject(submitted.id, 'mod-1', 'because_i_said_so', 'No'), /reason is invalid/);
const rejected = workflow.reject(submitted.id, 'mod-1', 'insufficient_evidence', 'Add independent evidence.');
assert.equal(rejected.status, 'rejected');
const edited = workflow.edit(submitted.id, { evidence: [...valid.evidence, { type: 'documentation', url: 'https://docs.example.com/agent', submittedAt: '2026-08-25T01:30:00Z' }] }, 'owner-1');
assert.equal(edited.revision, 2);
assert.equal(workflow.approve(submitted.id, 'mod-2').status, 'approved');
assert.throws(() => workflow.approve(submitted.id, 'mod-2'), /not pending/);
const report = workflow.report(submitted.id, 'reporter-1', 'misleading_claims', 'The destination changed its claims.');
assert.throws(() => workflow.takedown(submitted.id, 'mod-3', 'Confirmed abuse', 'report-wrong'), /open report/);
assert.equal(workflow.takedown(submitted.id, 'mod-3', 'Confirmed misleading claims', report.id).status, 'removed');
assert.equal(workflow.reports(submitted.id)[0].status, 'resolved');
assert.deepEqual(workflow.auditTrail(submitted.id).map(event => event.action), ['submitted', 'rejected', 'edited', 'approved', 'reported', 'removed']);
const audit = workflow.auditTrail(submitted.id); audit[0].detail.revision = 999;
assert.equal(workflow.auditTrail(submitted.id)[0].detail.revision, 1);
console.log('moderation workflow adversarial checks passed');
