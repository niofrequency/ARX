import { collection, doc, setDoc, onSnapshot, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface Transaction {
  id: string;
  amountUsd: number;
  status: string;
  provider: string;
  createdAt: string;
}

/**
 * Writes the "this order belongs to this user, for this amount" record
 * BEFORE creating the actual NOWPayments invoice, so that when the webhook
 * fires later (server-side, with no user auth context of its own) it knows
 * whose wallet to credit and by how much. The amount itself is never
 * trusted from the client at credit time — only this doc's value, written
 * against a fixed server-side price list, is ever used.
 */
export const createPendingPayment = async (uid: string, orderId: string, amountUsd: number): Promise<void> => {
  await setDoc(doc(db, 'pendingPayments', orderId), {
    uid,
    amountUsd,
    createdAt: Date.now(),
  });
};

/**
 * Subscribes to a user's live credit balance. Fires immediately with the
 * current value, then again automatically the moment the NOWPayments
 * webhook credits a completed top-up — no manual refresh/poll needed.
 * Returns an unsubscribe function.
 */
export const subscribeToWalletBalance = (uid: string, onChange: (balanceUsd: number) => void): (() => void) => {
  const ref = doc(db, 'users', uid, 'wallet', 'main');
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.data();
      onChange(typeof data?.balanceUsd === 'number' ? data.balanceUsd : 0);
    },
    (err) => {
      console.error('Failed to subscribe to wallet balance', err);
      onChange(0);
    }
  );
};

/** Fetches a user's most recent top-up transactions. */
export const fetchRecentTransactions = async (uid: string, max = 20): Promise<Transaction[]> => {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt', 'desc'), limit(max))
  );
  return snap.docs.map((d) => d.data() as Transaction);
};

export interface ReserveResult {
  ok: boolean;
  balance?: number;
  error?: string;
}

/**
 * Atomically reserves (deducts) credits for a generation BEFORE it's
 * submitted to Wavespeed — this is a real server-side check, not just
 * trusting the locally-cached balance, so two generations started at nearly
 * the same moment can never both succeed against a balance that only
 * covers one of them.
 */
export const reserveCredits = async (
  idToken: string,
  taskId: string,
  amountUsd: number,
  modelInfo: string
): Promise<ReserveResult> => {
  try {
    const res = await fetch('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ action: 'reserve', taskId, amountUsd, modelInfo }),
    });
    const data = await res.json();
    return { ok: res.ok && data.ok, balance: data.balance, error: data.error };
  } catch (e) {
    console.error('Failed to reserve credits', e);
    return { ok: false, error: 'network_error' };
  }
};

/**
 * Refunds a previously-reserved charge — used when a generation ultimately
 * fails. Safe to call more than once for the same taskId (the server only
 * refunds a charge that's still in the 'completed'/charged state).
 */
export const refundCredits = async (idToken: string, taskId: string, amountUsd: number): Promise<void> => {
  try {
    await fetch('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ action: 'refund', taskId, amountUsd }),
    });
  } catch (e) {
    console.error('Failed to refund credits', e);
  }
};
