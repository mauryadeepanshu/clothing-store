const mongoose = require('mongoose');

/**
 * MongoDB transactions need a replica set (MongoDB Atlas always is one). We detect support once at startup.
 * With transactions, multi-document writes (stock + order + coupon) commit or roll back together.
 * Without them (e.g. a standalone local mongod), callers fall back to compensating writes.
 */
const state = { enabled: false, checked: false };

async function detectTransactions() {
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    state.enabled = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    state.enabled = false;
  }
  if (process.env.DISABLE_TRANSACTIONS === 'true') state.enabled = false;
  state.checked = true;
  return state.enabled;
}

/**
 * Runs work(session) inside a transaction when available, otherwise work(null).
 * work() must have no external side effects (emails, HTTP calls): it may be retried on transient errors.
 */
async function withTx(work) {
  if (!state.enabled) return work(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTx, detectTransactions, txState: state };
