/**
 * Reliable multi-phase scroll-to-top utility.
 * Ensures the page resets to the top instantly and remains at top
 * across React DOM updates, image loads, and browser anchor navigation.
 */
export function scrollToPageTop() {
  if (typeof window === 'undefined') return;

  const performReset = () => {
    // 1. Native window scroll
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }

    // 2. Document elements
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // 3. Known inner containers
    const mainContainer = document.getElementById('main-content-container');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
    const rootElem = document.getElementById('root');
    if (rootElem) {
      rootElem.scrollTop = 0;
    }
  };

  // Immediate execution
  performReset();

  // Next animation frame (handles DOM paint)
  requestAnimationFrame(() => {
    performReset();
  });

  // Timed execution to overcome late component mount & image layout shifts
  setTimeout(performReset, 25);
  setTimeout(performReset, 80);
  setTimeout(performReset, 180);
}
