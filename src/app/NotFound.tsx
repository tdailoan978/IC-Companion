import { Link } from 'react-router';

type Props = { title?: string; message?: string };

export function NotFound({ title = 'Page not found', message = 'There is nothing at this address.' }: Props) {
  return (
    <div className="page message-page">
      <h1>{title}</h1>
      <p>{message}</p>
      <Link to="/" className="button">
        Back to the lessons
      </Link>
    </div>
  );
}
