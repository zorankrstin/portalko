import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    // Initialize
    toggleVisibility();

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-24 lg:bottom-8 right-4 lg:right-8 p-3.5 rounded-full bg-primary text-on-primary shadow-md hover:shadow-lg hover:bg-primary-container hover:text-on-primary-container transition-all duration-300 z-40 flex items-center justify-center ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      }`}
      aria-label="Nazaj na vrh"
      title="Nazaj na vrh"
    >
      <ArrowUp className="w-[1.25em] h-[1.25em] text-xl" />
    </button>
  );
}
