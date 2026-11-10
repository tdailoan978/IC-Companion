import { Navigate, createHashRouter } from 'react-router';
import { Shell } from './Shell.tsx';
import { NotFound } from './NotFound.tsx';
import { RouteError } from './RouteError.tsx';
import { HomePage } from '../features/home/HomePage.tsx';
import { LessonLayout } from '../features/lesson/LessonLayout.tsx';
import { LessonStep } from '../features/lesson/LessonStep.tsx';

// Hash routing: GitHub Pages cannot rewrite deep links to index.html.
//   #/                          Home
//   #/lesson/:level/:id         → redirects to the overview step
//   #/lesson/:level/:id/:step   one step of a lesson (see features/lesson/steps.ts)
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
      { path: '*', element: <NotFound /> },
    ],
  },
]);
