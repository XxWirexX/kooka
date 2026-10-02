import { BookOpen, Refrigerator, Sparkles } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

const tabs = [
  { to: '/', label: 'Idées', icon: Sparkles, end: true },
  { to: '/inventaire', label: 'Inventaire', icon: Refrigerator, end: false },
  { to: '/recettes', label: 'Recettes', icon: BookOpen, end: false },
];

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pt-6 pb-28">
        <Outlet />
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-cream/90 backdrop-blur">
        <ul className="mx-auto flex max-w-lg">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                    isActive ? 'text-tomato' : 'text-muted hover:text-ink'
                  }`
                }
              >
                <Icon size={22} strokeWidth={2} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
