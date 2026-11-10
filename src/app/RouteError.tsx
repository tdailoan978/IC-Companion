import { useRouteError } from 'react-router';

/** Last-resort screen if a page throws while rendering. */
export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="page message-page">
      <h1>Something went wrong</h1>
      <p>{error instanceof Error ? error.message : 'An unexpected error stopped this page.'}</p>
      <a href="#/" className="button">
        Back to the lessons
      </a>
    </div>
  );
}
