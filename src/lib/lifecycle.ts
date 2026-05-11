/**
 * Run an init function on initial page load and after every Astro
 * View Transition swap. If `init` returns a cleanup function, it's
 * invoked before the next swap so listeners and observers don't leak
 * across navigations.
 *
 * Usage:
 *   import { onPageLoad } from '../../lib/lifecycle';
 *
 *   onPageLoad(() => {
 *     const btn = document.querySelector('[data-thing]');
 *     if (!btn) return;
 *     const onClick = () => doStuff();
 *     btn.addEventListener('click', onClick);
 *     return () => btn.removeEventListener('click', onClick);
 *   });
 */
export function onPageLoad(init: () => (() => void) | void): void {
  if (typeof document === 'undefined') return;
  let cleanup: (() => void) | void = undefined;
  const run = () => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = init();
  };
  run();
  document.addEventListener('astro:page-load', run);
}
