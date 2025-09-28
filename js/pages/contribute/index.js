// /js/contribute/index.js
import { createStore } from './state.js';
import { bus } from './bus.js';
import mountHero from './hero/index.js';
import mountPledge from './pledge/index.js';
import mountSetContribution from './setcontribution/index.js';
import mountProjection from './projection/index.js';
import mountActivity from './activity/index.js';
import { whoami } from '/js/shared/api.js';

const initial = {
  user: null,
  member: null,
  pledge: { currentMonthly: 0, totalContributed: 0, nextBillingDate: null, hasDefaultCard: false, cardSummary: '' },
  contribInput: 0,
  horizon: 6,
  statusBanner: ''
};

function main() {
  const store = createStore(initial);

  // Preload auth (doesn't reveal hero until summary arrives too)
  whoami().then(u => { if (u) store.patch({ user: u }); }).catch(() => {});

  const unmounts = [
    mountHero({ store, bus }),
    mountPledge({ store, bus }),
    mountSetContribution({ store, bus }),
    mountProjection({ store, bus }),
    mountActivity({ store, bus })
  ].filter(Boolean);

  // Stripe redirect banner
  const url = new URL(location.href);
  const status = url.searchParams.get('status');
  if (status) store.patch({ statusBanner: status === 'success' ? 'Billing portal update successful.' : 'There was an issue updating billing.' });

  window.__contribute = { store, bus, unmounts };
}

document.readyState !== 'loading' ? main() : document.addEventListener('DOMContentLoaded', main);
