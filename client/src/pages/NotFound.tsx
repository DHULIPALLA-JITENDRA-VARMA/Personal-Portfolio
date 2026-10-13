import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageState } from '../components/PageState';

export default function NotFound() {
  return (
    <PageState title="Page not found.">
      <p>The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="btn-ghost mt-6">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to home
      </Link>
    </PageState>
  );
}
