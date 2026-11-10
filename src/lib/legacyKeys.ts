/**
 * One-time key rename after the Novaframe → WebXstudio rebrand.
 *
 * Browser storage keys moved from `nf_*` to `wx_*`. Carrying the old values over
 * on first load keeps signed-in admins and partners signed in, and preserves a
 * visitor's referral attribution, the cached site content and any demo-workspace
 * data. Imported before the app so every later read already sees the new keys.
 */
function migrate(store: Storage) {
  // Backwards: removeItem() reindexes the store as we go.
  for (let i = store.length - 1; i >= 0; i -= 1) {
    const key = store.key(i);
    if (!key?.startsWith("nf_")) continue;
    const value = store.getItem(key);
    const renamed = `wx_${key.slice(3)}`;
    if (value !== null && store.getItem(renamed) === null) store.setItem(renamed, value);
    store.removeItem(key);
  }
}

try {
  migrate(localStorage);
  migrate(sessionStorage);
} catch {
  /* Storage blocked (private mode, strict cookie rules) — nothing to carry over. */
}
