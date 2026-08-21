import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-slate-500">
      <div className="text-5xl">🥩</div>
      <h1 className="text-xl font-semibold text-slate-800">Page not found</h1>
      <Link to="/" className="text-brand-600 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
