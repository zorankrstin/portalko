/**
 * Reliable multi-phase scroll-to-top utility.
 * Ensures the page resets to the top instantly and remains at top
 * across React DOM updates, image loads, and browser anchor navigation.
 */

/**
 * Resets both the left and right sidebars to the top.
 * Supports multiple passes to overcome React component re-mounts and state updates.
 */
export function scrollToSidebarsTop(behavior: ScrollBehavior = 'instant') {
  if (typeof window === 'undefined') return;

  const performSidebarReset = () => {
    // 1. Direct IDs
    const leftSidebar = document.getElementById('left-sidebar');
    if (leftSidebar) {
      leftSidebar.scrollTop = 0;
      try {
        leftSidebar.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        leftSidebar.scrollTop = 0;
      }
    }

    const rightSidebar = document.getElementById('right-sidebar');
    if (rightSidebar) {
      rightSidebar.scrollTop = 0;
      try {
        rightSidebar.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        rightSidebar.scrollTop = 0;
      }
    }

    // 2. Query all aside elements and tagged sidebars
    const allSidebars = document.querySelectorAll<HTMLElement>(
      'aside, [data-sidebar], .sidebar-scrollable, [id*="sidebar"], [id*="Sidebar"]'
    );
    allSidebars.forEach((el) => {
      el.scrollTop = 0;
      try {
        el.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        el.scrollTop = 0;
      }
    });
  };

  // Immediate pass
  performSidebarReset();

  // Animation frame (handles browser paint and reflow)
  requestAnimationFrame(performSidebarReset);

  // Progressive delayed passes for mounting sidebars (kept brief to avoid interfering with user interactions)
  setTimeout(performSidebarReset, 25);
  setTimeout(performSidebarReset, 60);
}

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
      document.documentElement.scrollLeft = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
      document.body.scrollLeft = 0;
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

    // 4. Reset both sidebars
    scrollToSidebarsTop('instant');
  };

  // Immediate execution
  performReset();

  // Next animation frame (handles DOM paint)
  requestAnimationFrame(() => {
    performReset();
  });

  // Safe delayed execution: only resets if the user is still at or near the top (< 120px)
  // This prevents any unwanted jerk/scroll-hijacking when the user has already begun scrolling down!
  const safeReset = () => {
    const currentY = window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0;
    if (currentY < 120) {
      performReset();
    }
  };

  setTimeout(safeReset, 25);
  setTimeout(safeReset, 80);
}

