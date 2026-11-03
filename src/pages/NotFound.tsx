import { Link } from 'react-router';

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">Error 404</p>
      <h1>This page isn’t in the stacks.</h1>
      <p className="not-found__lede">
        The link may be broken, or the page may have been moved. Head back and keep studying.
      </p>
      <div className="not-found__actions">
        <Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
        <Link to="/" className="btn btn-secondary">Home</Link>
      </div>
    </main>
  );
}
