// /js/shared/skeletons.js
// Tiny utilities for consistent skeletons across the app (Tailwind-only).

/**
 * Toggle a skeleton/content pair by prefix.
 * Expects #<prefix>Skeleton and #<prefix>Content in the DOM.
 */
// /js/shared/skeletons.js
export function togglePair(baseId, showSkeleton) {
  const sk = document.getElementById(`${baseId}Skeleton`);
  const ct = document.getElementById(`${baseId}Content`);
  if (!sk || !ct) return;
  sk.classList.toggle('hidden', !showSkeleton);
  ct.classList.toggle('hidden', showSkeleton);
}

export const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Render a simple list skeleton with N rows into a container.
 * If container already has children, it’ll be replaced.
 */
export function renderListSkeleton(container, rows = 3) {
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('animate-pulse', 'divide-y', 'border', 'rounded-lg', 'bg-white');
  for (let i = 0; i < rows; i++) {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-3';
    const left = document.createElement('div');
    left.className = 'h-4 bg-gray-200 rounded';
    left.style.width = `${40 + Math.round(Math.random()*20)}%`;
    const right = document.createElement('div');
    right.className = 'h-4 bg-gray-200 rounded';
    right.style.width = `${10 + Math.round(Math.random()*10)}%`;
    row.appendChild(left); row.appendChild(right);
    container.appendChild(row);
  }
}

/**
 * Remove skeleton styling from a list container and show real content.
 */
export function clearListSkeleton(container) {
  if (!container) return;
  container.classList.remove('animate-pulse');
}

/**
 * Disable/enable a group of interactive elements while loading.
 */
export function setBusy(selectors, isBusy) {
  const nodes = Array.isArray(selectors) ? selectors : [selectors];
  nodes
    .flatMap(s => typeof s === 'string' ? [...document.querySelectorAll(s)] : [s])
    .filter(Boolean)
    .forEach(el => {
      el.toggleAttribute('disabled', isBusy);
      el.classList.toggle('opacity-60', isBusy);
      el.classList.toggle('cursor-not-allowed', isBusy);
    });
}
