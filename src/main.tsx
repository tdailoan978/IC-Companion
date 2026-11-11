import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router.tsx';
import './styles/theme.css';
import './styles/base.css';
import './app/components.css';
import { startSettings } from './app/applySettings.ts';

// Font size, voice and speech rate; voices load late on iOS, so this starts before the first tap.
startSettings();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
