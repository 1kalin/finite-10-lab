import { isIP } from 'node:net';

const REJECTION_REASONS = new Set(['insufficient_evidence', 'invalid_destination', 'misleading_claims', 'duplicate', 'out_of_scope']);
const REPORT_REASONS = new Set(['broken_link', 'misleading_claims', 'impersonation', 'malware', 'spam', 'other']);

function required(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} must be a non-empty string`);
  return value.trim();
}

function timestamp(value, name) {
  required(value, name);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${name} must be a valid timestamp`);
  return value;
}

function safeUrl(value, name) {
  required(value, name);
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid URL`); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(`${name} must be a public https URL`);
  const hostname = parsed.hostname.toLowerCase();
  const ipKind = isIP(hostname);
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') ||
      /^(127\.|10\.|192\.168\.|169\.254\.)/.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      hostname === '::1' || (ipKind === 6 && (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe8') || hostname.startsWith('fe9') || hostname.startsWith('fea') || hostname.startsWith('feb')))) {
    throw new Error(`${name} must not target a local or private host`);
  }
  return parsed.toString();
}

function validateEvidence(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('evidence must be a non-empty array');
  return entries.map((entry, index) => ({
    type: required(entry && entry.type, `evidence[${index}].type`),
    url: safeUrl(entry && entry.url, `evidence[${index}].url`),
    submittedAt: timestamp(entry && entry.submittedAt, `evidence[${index}].submittedAt`)
  }));
}

function validateSubmission(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('submission must be an object');
  const categories = input.categories;
  if (!Array.isArray(categories) || categories.length === 0) throw new Error('categories must be a non-empty array');
  return {
    name: required(input.name, 'name'),
    summary: required(input.summary, 'summary'),
    description: required(input.description, 'description'),
    ownerId: required(input.ownerId, 'ownerId'),
    destinationUrl: safeUrl(input.destinationUrl, 'destinationUrl'),
    categories: categories.map((value, index) => required(value, `categories[${index}]`)),
    evidence: validateEvidence(input.evidence)
  };
}

const clone = value => structuredClone(value);

export class ModerationWorkflow {
  #records = new Map(); #reports = new Map(); #audit = []; #now; #sequence = 0;

  constructor({ now = () => new Date(), id = prefix => `${prefix}-${++this.#sequence}` } = {}) {
    this.#now = now;
    this.id = id;
  }

  submit(input, actorId) {
    const actor = required(actorId, 'actorId');
    const data = validateSubmission(input);
    const record = { id: this.id('submission'), revision: 1, status: 'pending_review', ...data, createdAt: this.#at(), updatedAt: this.#at() };
    this.#records.set(record.id, record);
    this.#log('submitted', record.id, actor, { revision: record.revision });
    return clone(record);
  }

  edit(id, changes, actorId) {
    const record = this.#record(id); const actor = required(actorId, 'actorId');
    if (record.ownerId !== actor) throw new Error('only the owner may edit a submission');
    if (!['pending_review', 'rejected'].includes(record.status)) throw new Error(`cannot edit a ${record.status} submission`);
    const next = validateSubmission({ ...record, ...changes });
    Object.assign(record, next, { revision: record.revision + 1, status: 'pending_review', rejection: null, updatedAt: this.#at() });
    this.#log('edited', id, actor, { revision: record.revision });
    return clone(record);
  }

  approve(id, moderatorId) {
    const record = this.#pending(id); const actor = required(moderatorId, 'moderatorId');
    Object.assign(record, { status: 'approved', reviewedAt: this.#at(), reviewedBy: actor, updatedAt: this.#at() });
    this.#log('approved', id, actor, { revision: record.revision });
    return clone(record);
  }

  reject(id, moderatorId, reason, detail) {
    const record = this.#pending(id); const actor = required(moderatorId, 'moderatorId');
    if (!REJECTION_REASONS.has(reason)) throw new Error('rejection reason is invalid');
    record.status = 'rejected'; record.rejection = { reason, detail: required(detail, 'detail') };
    record.reviewedAt = this.#at(); record.reviewedBy = actor; record.updatedAt = this.#at();
    this.#log('rejected', id, actor, { reason, revision: record.revision });
    return clone(record);
  }

  report(id, reporterId, reason, detail) {
    this.#record(id); const actor = required(reporterId, 'reporterId');
    if (!REPORT_REASONS.has(reason)) throw new Error('report reason is invalid');
    const report = { id: this.id('report'), submissionId: id, reporterId: actor, reason, detail: required(detail, 'detail'), status: 'open', createdAt: this.#at() };
    this.#reports.set(report.id, report); this.#log('reported', id, actor, { reportId: report.id, reason });
    return clone(report);
  }

  takedown(id, moderatorId, reason, reportId = null) {
    const record = this.#record(id); const actor = required(moderatorId, 'moderatorId');
    if (record.status !== 'approved') throw new Error('only approved submissions may be taken down');
    if (reportId !== null) {
      const report = this.#reports.get(reportId);
      if (!report || report.submissionId !== id || report.status !== 'open') throw new Error('reportId must reference an open report for this submission');
      report.status = 'resolved'; report.resolvedAt = this.#at(); report.resolvedBy = actor;
    }
    Object.assign(record, { status: 'removed', removal: { reason: required(reason, 'reason'), reportId }, updatedAt: this.#at() });
    this.#log('removed', id, actor, { reason, reportId });
    return clone(record);
  }

  get(id) { return clone(this.#record(id)); }
  auditTrail(id) { this.#record(id); return this.#audit.filter(entry => entry.submissionId === id).map(clone); }
  reports(id) { this.#record(id); return [...this.#reports.values()].filter(report => report.submissionId === id).map(clone); }

  #record(id) { const record = this.#records.get(id); if (!record) throw new Error(`unknown submission: ${id}`); return record; }
  #pending(id) { const record = this.#record(id); if (record.status !== 'pending_review') throw new Error('submission is not pending review'); return record; }
  #at() { return this.#now().toISOString(); }
  #log(action, submissionId, actorId, detail) { this.#audit.push(Object.freeze({ sequence: this.#audit.length + 1, action, submissionId, actorId, at: this.#at(), detail: clone(detail) })); }
}

export { REJECTION_REASONS, REPORT_REASONS, validateSubmission };
