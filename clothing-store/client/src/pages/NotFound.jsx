import usePageTitle from '../lib/usePageTitle';
import { Link } from 'react-router-dom';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="container-x py-28 text-center">
      <p className="font-display text-8xl">404</p>
      <h1 className="mt-4 text-3xl">This page doesn’t exist</h1>
      <p className="mt-2 text-sm text-stone">The link may be old, or the page may have moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="btn">Go home</Link>
        <Link to="/shop" className="btn-outline">Shop all</Link>
      </div>
    </div>
  );
}
