// Firefox Gecko & third-party ad script guard (iPROM, AdSense, etc.)
// Prevents NS_ERROR_UNEXPECTED crashes when getBoundingClientRect/getComputedStyle is called on iframe elements
if (typeof Element !== 'undefined' && Element.prototype && Element.prototype.getBoundingClientRect) {
  const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function() {
    try {
      return origGetBoundingClientRect.apply(this, arguments as any);
    } catch {
      if (typeof DOMRect !== 'undefined') {
        try { return new DOMRect(0, 0, 0, 0); } catch {}
      }
      return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => this } as any;
    }
  };
}

if (typeof window !== 'undefined' && window.getComputedStyle) {
  const origGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function(el: Element, pseudo?: string | null) {
    try {
      return origGetComputedStyle.apply(this, arguments as any);
    } catch {
      return ((el as HTMLElement)?.style || {}) as any;
    }
  };
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { AuthProvider } from './contexts/AuthContext';
import { LikeProvider } from './contexts/LikeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ReportProvider } from './contexts/ReportContext';
import { EventFilterProvider } from './contexts/EventFilterContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LikeProvider>
        <NotificationProvider>
          <BookmarkProvider>
            <ReportProvider>
              <EventFilterProvider>
                <App />
              </EventFilterProvider>
            </ReportProvider>
          </BookmarkProvider>
        </NotificationProvider>
      </LikeProvider>
    </AuthProvider>
  </StrictMode>,
);
