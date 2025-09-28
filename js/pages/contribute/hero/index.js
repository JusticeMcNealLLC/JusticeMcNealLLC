// Orchestrates the hero: loads data, reveals once, and keeps cancel row fresh.
import { whoami, loadContributionSummary } from '/js/shared/api.js';
import { computeDisplayName, computeMainCta, getCancelState } from './compute.js';
import * as view from './view.js';
import { wireResume } from './actions.js';

export default function mountHero({ store, bus }) {
  view.init();

  let gotUser = false;
  let gotSummary = false;
  let latestSummary = null;
  let revealed = false;
  let unResume = null;

  // Only use store subscription for transient banners (avoid flicker in name/CTA)
  const unsubStore = store.subscribe((s) => {
    if (s.statusBanner) {
      view.showBanner(s.statusBanner);
      store.patch({ statusBanner: '' });
    }
  });

  // Load user
  whoami()
    .then((u) => { if (u) store.patch({ user: u }); })
    .catch(() => {})
    .finally(() => { gotUser = true; tryReveal(); });

  // Load summary and expose member early
  loadContributionSummary()
    .then((summary) => {
      latestSummary = summary;
      if (summary?.member) {
        const cur = store.get();
        if (!cur.member || JSON.stringify(cur.member) !== JSON.stringify(summary.member)) {
          store.patch({ member: summary.member });
        }
      }
      bus.emit('pledge:summary:loaded', summary);
    })
    .catch(() => {})
    .finally(() => { gotSummary = true; tryReveal(); });

  function tryReveal() {
    if (revealed || !(gotUser && gotSummary)) return;

    const s = store.get();
    const name = computeDisplayName(s, latestSummary);
    const cta  = computeMainCta(latestSummary, s);
    const c    = getCancelState(latestSummary, s);

    view.reveal({ name, cta, cancelIso: c.show ? c.iso : null });
    revealed = true;

    // Wire resume after reveal
    unResume = wireResume(view.els, {
      showBanner: view.showBanner,
      onRefreshed: (ref) => {
        latestSummary = ref;
        const s2 = store.get();
        const c2 = getCancelState(ref, s2);
        view.updateCancel(c2.show ? c2.iso : null);
        bus.emit('contrib:status:refreshed', ref);
      },
    });
  }

  // After reveal, keep only the cancel row in sync (no name/CTA flips)
  const onLoaded = (summary) => {
    latestSummary = summary;
    if (!revealed) return;
    const c = getCancelState(summary, store.get());
    view.updateCancel(c.show ? c.iso : null);
  };
  const onRefreshed = onLoaded;
  bus.on('pledge:summary:loaded', onLoaded);
  bus.on('contrib:status:refreshed', onRefreshed);

  return () => {
    unsubStore?.();
    bus.off('pledge:summary:loaded', onLoaded);
    bus.off('contrib:status:refreshed', onRefreshed);
    unResume?.();
    view.dispose();
  };
}
