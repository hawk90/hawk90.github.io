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
type Cleanup = () => void;
type InitResult = Cleanup | void | Promise<Cleanup | void>;

export function onPageLoad(init: () => InitResult): void {
  if (typeof document === 'undefined') return;
  let cleanup: Cleanup | void = undefined;
  let runId = 0;
  const run = async () => {
    const currentRun = ++runId;
    if (typeof cleanup === 'function') cleanup();
    cleanup = undefined;
    const nextCleanup = await init();
    if (currentRun === runId) {
      cleanup = nextCleanup;
    } else if (typeof nextCleanup === 'function') {
      nextCleanup();
    }
  };
  run();
  document.addEventListener('astro:page-load', run);
}
