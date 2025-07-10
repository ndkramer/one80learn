import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './utils/authContext';
import App from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);