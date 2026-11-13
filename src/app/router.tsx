import { Navigate, createHashRouter } from 'react-router';
import { Shell } from './Shell.tsx';
import { NotFound } from './NotFound.tsx';
import { RouteError } from './RouteError.tsx';
import { HomePage } from '../features/home/HomePage.tsx';
import { LessonLayout } from '../features/lesson/LessonLayout.tsx';
import { LessonStep } from '../features/lesson/LessonStep.tsx';
import { ReviewPage } from '../features/review/ReviewPage.tsx';
import { SettingsPage } from '../features/settings/SettingsPage.tsx';
import { PlanPage } from '../features/plan/PlanPage.tsx';
import { NotePage } from '../features/notes/NotePage.tsx';
import { NotebookPage } from '../features/notebook/NotebookPage.tsx';
import { MyWordsPage } from '../features/mywords/MyWordsPage.tsx';
import { NotePagePrototype } from '../features/prototype/NotePagePrototype.tsx';

// Hash routing: GitHub Pages cannot rewrite deep links to index.html.
//   #/                          Home
//   #/lesson/:level/:id         → redirects to the overview step
//   #/lesson/:level/:id/:step   one step of a lesson (see features/lesson/steps.ts)
//   #/review                    today's vocabulary review session
//   #/plan                      study plan: today's checklist and the week
//   #/settings                  settings, export / import, reset
//   #/note/:level/:id/:kind/:ref  one note (book tasks: the reading page with its timer)
//   #/notebook                  every note, by lesson; search; print to PDF
//   #/my-words                  words I added to review from my notes
export const router = createHashRouter([
  {
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'lesson/:level/:id',
        element: <LessonLayout />,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: ':step', element: <LessonStep /> },
        ],
      },
      { path: 'review', element: <ReviewPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'note/:level/:id/:kind/:ref', element: <NotePage /> },
      { path: 'notebook', element: <NotebookPage /> },
      { path: 'my-words', element: <MyWordsPage /> },
      // PROTOTYPE: remove when the real note page is built
      { path: 'prototype/note', element: <NotePagePrototype /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
