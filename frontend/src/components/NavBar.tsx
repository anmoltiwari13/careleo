import { Link } from "react-router-dom";

export function NavBar({
  onToggleTheme,
  dark,
  isAdmin
}: {
  onToggleTheme: () => void;
  dark: boolean;
  isAdmin: boolean;
}) {
  return (
    <header className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <Link to="/" className="font-display text-2xl font-extrabold tracking-tight text-sky-600 dark:text-cyan-300">
        Careleo
      </Link>
      <nav className="flex w-full flex-wrap items-center gap-3 text-sm font-semibold lg:w-auto lg:justify-end lg:gap-6">
        {isAdmin ? <Link to="/admin" className="rounded-full px-3 py-2 hover:text-sky-600">Admin</Link> : <Link to="/" className="rounded-full px-3 py-2 hover:text-sky-600">Sign In</Link>}
        <Link to="/hospital" className="rounded-full px-3 py-2 hover:text-sky-600">Hospital Site</Link>
        <Link to="/doctor" className="rounded-full px-3 py-2 hover:text-sky-600">Doctor Profile</Link>
        <button onClick={onToggleTheme} className="ml-auto rounded-full border border-slate-300 px-4 py-2 dark:border-slate-700 lg:ml-0">
          {dark ? "Light" : "Dark"}
        </button>
      </nav>
    </header>
  );
}
