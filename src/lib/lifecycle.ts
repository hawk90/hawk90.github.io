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

  // `run()` above already covered the page this script was loaded on, but
  // Astro's ClientRouter fires astro:page-load for that same page too (on the
  // first page's window `load`, or right after the swap when the script first
  // arrives with a navigation). Running again tore down the first init and
  // started over — double work, and giscus lost its message listener that way.
  // So skip the next page-load unless a new navigation has begun since.
  let skipNextPageLoad = true;
  document.addEventListener('astro:before-swap', () => {
    skipNextPageLoad = false;
  });
  document.addEventListener('astro:page-load', () => {
    if (skipNextPageLoad) {
      skipNextPageLoad = false;
      return;
    }
    run();
  });
}
