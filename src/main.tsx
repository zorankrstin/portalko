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
