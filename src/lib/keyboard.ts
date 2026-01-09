/**
 * Check if the event target is an input element where keyboard shortcuts should be ignored
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  // Standard form elements
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }

  // Contenteditable elements
  if (target.isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Create a keyboard shortcut handler
 */
export function createKeyboardHandler(
  shortcuts: Record<string, () => void>,
  options: { ignoreInInputs?: boolean } = {}
): (e: KeyboardEvent) => void {
  const { ignoreInInputs = true } = options;

  return (e: KeyboardEvent) => {
    if (ignoreInInputs && isInputElement(e.target)) {
      return;
    }

    const handler = shortcuts[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  };
}

let postNavigationCleanup: (() => void) | null = null;

/**
 * Navigate to previous/next post using j/k keys
 * Returns a cleanup function to remove the event listener
 */
export function setupPostNavigation(): () => void {
  // 이전 리스너 정리
  postNavigationCleanup?.();

  function handleKeydown(e: KeyboardEvent) {
    if (isInputElement(e.target)) return;

    const prevLink = document.querySelector<HTMLAnchorElement>('[data-prev-post]');
    const nextLink = document.querySelector<HTMLAnchorElement>('[data-next-post]');

    if (e.key === 'j' && nextLink) {
      nextLink.click();
    } else if (e.key === 'k' && prevLink) {
      prevLink.click();
    }
  }

  document.addEventListener('keydown', handleKeydown);

  postNavigationCleanup = () => {
    document.removeEventListener('keydown', handleKeydown);
  };

  return postNavigationCleanup;
}
