/**
 * pages/common/NotFoundPage.tsx
 * Generic 404 page for unmatched routes.
 */
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] p-8 gap-6 animate-in fade-in duration-500">
      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
        <AlertTriangle size={40} />
      </div>
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-[var(--text-primary)] tracking-tight">404</h1>
        <p className="text-xl font-bold text-[var(--text-muted)] mt-2">Page Not Found</p>
        <p className="text-sm text-[var(--text-muted)] mt-2 max-w-md">
          The page you are looking for doesn't exist or you don't have permission to access it.
        </p>
      </div>
      <Link
        to="/dashboard"
        className="px-6 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
