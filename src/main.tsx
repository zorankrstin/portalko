import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ReportProvider } from './contexts/ReportContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <BookmarkProvider>
          <ReportProvider>
            <App />
          </ReportProvider>
        </BookmarkProvider>
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>,
);
