import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { AuthProvider } from './contexts/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BookmarkProvider>
      <App />
    </BookmarkProvider>
    </AuthProvider>
  </StrictMode>,
);
