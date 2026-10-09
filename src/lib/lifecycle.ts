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
  // The <body> the last init ran against. ClientRouter replaces the whole
  // <body> element on every navigation (swapBodyElement → replaceWith), so a
  // new element means a new page.
  let initializedBody: HTMLElement | null = null;
  const run = async () => {
    initializedBody = document.body;
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

  // ClientRouter also fires astro:page-load for pages `run()` has already
  // covered: the first page on window `load`, and the page a script arrives
  // with, right after its swap — and a slow first `load` can land after a
  // navigation. Running again tore down the init and started over (double
  // work; giscus lost its message listener that way). Matching on the <body>
  // element skips exactly those repeats, whatever order the events come in.
  document.addEventListener('astro:page-load', () => {
    if (document.body === initializedBody) return;
    run();
  });
}
