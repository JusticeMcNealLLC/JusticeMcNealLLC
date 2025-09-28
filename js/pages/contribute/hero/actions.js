import { resumeContribution, loadContributionSummary } from '/js/shared/api.js';
import { setBusy } from '/js/shared/skeletons.js';

/** Wire the Resume button; returns an unmount fn. */
export function wireResume(els, { showBanner, onRefreshed }) {
  async function handle() {
    if (!els.btnResume) return;
    setBusy(els.btnResume, true);
    try {
      const res = await resumeContribution(); // edge function
      if (res?.ok) showBanner('Cancellation removed.', 2800);

      const refreshed = await loadContributionSummary();
      onRefreshed?.(refreshed);
    } catch (e) {
      console.error('[resume] failed:', e);
      showBanner('Could not resume. Please try again.');
    } finally {
      setBusy(els.btnResume, false);
    }
  }

  els.btnResume?.addEventListener('click', handle);
  return () => els.btnResume?.removeEventListener('click', handle);
}
