const STATES = new Set(['available', 'held', 'claimed', 'expired', 'removed']);

function required(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} must be a non-empty string`);
}

const copy = value => structuredClone(value);

export class InventoryLedger {
  #items; #events; #requests; #now; #mutationTail;

  constructor(items, { now = () => new Date() } = {}) {
    if (!Array.isArray(items) || items.length === 0) throw new Error('items must be a non-empty array');
    this.#items = new Map(); this.#events = []; this.#requests = new Map(); this.#now = now;
    this.#mutationTail = Promise.resolve();
    for (const item of items) {
      required(item.id, 'item.id');
      if (this.#items.has(item.id)) throw new Error(`duplicate inventory id: ${item.id}`);
      if (!STATES.has(item.state)) throw new Error(`invalid inventory state: ${item.state}`);
      this.#items.set(item.id, copy(item));
    }
  }

  reserve({ itemId, requestId, holderId, holdUntil }) {
    return this.#mutate({ operation: 'reserve', itemId, requestId, holderId, holdUntil }, () => {
      for (const [value, name] of [[itemId, 'itemId'], [requestId, 'requestId'], [holderId, 'holderId']]) required(value, name);
      const item = this.#requireItem(itemId);
      this.#expireIfNeeded(item);
      if (item.state !== 'available') throw new Error(`inventory ${itemId} is not available`);
      const expiry = new Date(holdUntil);
      if (Number.isNaN(expiry.valueOf()) || expiry <= this.#now()) throw new Error('holdUntil must be a future timestamp');
      item.state = 'held'; item.holderId = holderId; item.holdUntil = expiry.toISOString();
      return { item: copy(item), event: this.#record('held', item, requestId) };
    });
  }

  claim({ itemId, requestId, holderId }) {
    return this.#mutate({ operation: 'claim', itemId, requestId, holderId }, () => {
      for (const [value, name] of [[itemId, 'itemId'], [requestId, 'requestId'], [holderId, 'holderId']]) required(value, name);
      const item = this.#requireItem(itemId);
      this.#expireIfNeeded(item);
      if (item.state !== 'held' || item.holderId !== holderId) throw new Error(`inventory ${itemId} is not held by ${holderId}`);
      item.state = 'claimed'; delete item.holdUntil;
      return { item: copy(item), event: this.#record('claimed', item, requestId) };
    });
  }

  remove({ itemId, requestId, reason }) {
    return this.#mutate({ operation: 'remove', itemId, requestId, reason }, () => {
      required(itemId, 'itemId'); required(requestId, 'requestId'); required(reason, 'reason');
      const item = this.#requireItem(itemId);
      item.state = 'removed'; item.removalReason = reason; delete item.holdUntil;
      return { item: copy(item), event: this.#record('removed', item, requestId) };
    });
  }

  snapshot() {
    for (const item of this.#items.values()) this.#expireIfNeeded(item);
    return { items: [...this.#items.values()].map(copy), events: this.#events.map(copy) };
  }

  publicCounts() {
    const counts = Object.fromEntries([...STATES].map(state => [state, 0]));
    for (const item of this.snapshot().items) counts[item.state] += 1;
    return counts;
  }

  #requireItem(itemId) {
    required(itemId, 'itemId');
    const item = this.#items.get(itemId);
    if (!item) throw new Error(`unknown inventory id: ${itemId}`);
    return item;
  }

  #expireIfNeeded(item) {
    if (item.state !== 'held' || new Date(item.holdUntil) > this.#now()) return;
    item.state = 'expired'; delete item.holdUntil;
    this.#record('expired', item, `expiry:${item.id}:${this.#now().toISOString()}`);
  }

  #record(type, item, requestId) {
    const event = { sequence: this.#events.length + 1, type, itemId: item.id, requestId, at: this.#now().toISOString() };
    this.#events.push(Object.freeze(event));
    return copy(event);
  }

  #mutate(identity, mutation) {
    const signature = JSON.stringify(identity);
    const operation = async () => {
      const previous = this.#requests.get(identity.requestId);
      if (previous) {
        if (previous.signature !== signature) throw new Error('requestId was already used for a different mutation');
        return copy(previous.result);
      }
      const result = mutation();
      this.#requests.set(identity.requestId, { signature, result: copy(result) });
      return result;
    };
    const pending = this.#mutationTail.then(operation, operation);
    this.#mutationTail = pending.then(() => undefined, () => undefined);
    return pending;
  }
}
