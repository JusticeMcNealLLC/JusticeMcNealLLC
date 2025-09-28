// /js/contribute/pledge/index.js
import { fmtUSD, fmtDate } from '../utils/format.js';
import { fetchPledgeSummary } from './service.js';
import { xfetch } from '/js/shared/api.js';
import { SUPABASE_URL, FUNCTIONS } from '/js/shared/config.js';
import * as Skel from '/js/shared/skeletons.js'; // togglePair('top', on) + optional setBusy()

export default function mountPledge({ store, bus }) {
  const ids = {
    currentPledge:    document.getElementById('currentPledge'),
    totalContributed: document.getElementById('totalContributed'),
    nextBillingDate:  document.getElementById('nextBillingDate'),
    topSkeleton:      document.getElementById('topSkeleton'),
    topContent:       document.getElementById('topContent'),
    cardRow:          document.getElementById('cardSummaryRow'),
    cardTxt:          document.getElementById('cardSummaryTxt'),
    cancelNote:       document.getElementById('cancelNote'),   // optional
    btnResume:        document.getElementById('btnResume'),    // optional
  };

  const resumeUrl =
    FUNCTIONS?.resumeContribution ||
    `${SUPABASE_URL}/functions/v1/resume-contribution`;

  /* ───────────────── Helpers ───────────────── */
  const nextFrame = () =>
    new Promise(resolve => requestAnimationFrame(() => resolve()));

  function setTopLoading(isLoading) {
    // Prefer shared helper if available
    if (typeof Skel.togglePair === 'function') {
      Skel.togglePair('top', isLoading);
    } else {
      // Fallback to direct class toggles
      ids.topSkeleton && ids.topSkeleton.classList.toggle('hidden', !isLoading);
      ids.topContent  && ids.topContent.classList.toggle('hidden',  isLoading);
    }
    // A11y hint
    if (ids.topSkeleton) {
      if (isLoading) ids.topSkeleton.setAttribute('aria-busy', 'true');
      else ids.topSkeleton.removeAttribute('aria-busy');
    }
  }

  function setResumeBusy(on) {
    // Use shared setBusy if exported; otherwise degrade gracefully
    if (typeof Skel.setBusy === 'function') {
      Skel.setBusy(['#btnResume'], !!on);
      return;
    }
    if (ids.btnResume) {
      ids.btnResume.disabled = !!on;
      ids.btnResume.classList.toggle('opacity-60', !!on);
      ids.btnResume.classList.toggle('pointer-events-none', !!on);
    }
  }

  async function wireResume() {
    if (!ids.btnResume) return;
    ids.btnResume.addEventListener('click', async () => {
      setResumeBusy(true);
      try {
        await xfetch(resumeUrl, { method: 'POST' });

        // Hide the cancel banner + button right away
        ids.cancelNote?.classList.add('hidden');
        ids.btnResume?.classList.add('hidden');

        // Notify listeners + refresh summary
        bus?.emit?.('pledge:resumed', {});
        const refreshed = await fetchPledgeSummary();
        store.patch({ pledge: refreshed, member: refreshed.member });
        bus?.emit?.('pledge:summary:loaded', refreshed);
      } catch (e) {
        console.error('[pledge] resume failed', e);
      } finally {
        setResumeBusy(false);
      }
    });
  }

  /* ───────────────── Mount ───────────────── */
  (async () => {
    setTopLoading(true);
    // ensure skeleton actually paints before network work
    await nextFrame();

    try {
      const s = await fetchPledgeSummary();
      store.patch({ pledge: s, member: s.member });

      // Numbers
      if (ids.currentPledge)    ids.currentPledge.textContent    = fmtUSD(s.currentMonthly);
      if (ids.totalContributed) ids.totalContributed.textContent = fmtUSD(s.totalContributed);
      if (ids.nextBillingDate)  ids.nextBillingDate.textContent  = fmtDate(s.nextBillingDate);

      // Default card row
      if (ids.cardRow) {
        if (s.hasDefaultCard) {
          ids.cardRow.classList.remove('hidden');
          ids.cardTxt.textContent = s.cardSummary || 'Default card on file';
        } else {
          ids.cardRow.classList.add('hidden');
        }
      }

      // Optional cancel banner + resume button
      const cancelIso =
        s?.cancel?.cancel_at_iso ||
        s?.member?.membership_cancel_at ||
        null;

      const cancelScheduled = !!(s?.cancel?.scheduled || cancelIso);
      if (ids.cancelNote) {
        if (cancelScheduled) {
          ids.cancelNote.textContent =
            `Canceling on ${fmtDate(cancelIso, { month: 'short', day: 'numeric', year: 'numeric' })}`;
          ids.cancelNote.classList.remove('hidden');
          ids.btnResume?.classList.remove('hidden');
        } else {
          ids.cancelNote.classList.add('hidden');
          ids.btnResume?.classList.add('hidden');
        }
      }

      bus?.emit?.('pledge:summary:loaded', s);
      wireResume();
    } catch (e) {
      console.error('[pledge] load failed', e);
      // Leave placeholders visible; content will show once issues are resolved
    } finally {
      setTopLoading(false);
    }
  })();

  return () => {};
}
