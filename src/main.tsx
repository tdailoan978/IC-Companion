import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router.tsx';
import './styles/theme.css';
import './styles/base.css';
import './app/components.css';
import { prepareSpeech } from './lib/speech.ts';

// Voices load late on iOS: get them ready before the first tap.
void prepareSpeech();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
