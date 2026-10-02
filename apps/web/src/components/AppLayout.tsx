import { BookOpen, Refrigerator, Sparkles, UserRound } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { useActiveCooking } from '../hooks/useCooking';
import { CookingChips } from './ActiveCooking';

const tabs = [
  { to: '/', label: 'Idées', icon: Sparkles, end: true },
  { to: '/inventaire', label: 'Inventaire', icon: Refrigerator, end: false },
  { to: '/recettes', label: 'Recettes', icon: BookOpen, end: false },
  { to: '/profil', label: 'Profil', icon: UserRound, end: false },
];

export function AppLayout() {
  const { data: cooking = [] } = useActiveCooking();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className={`flex-1 px-4 pt-6 ${cooking.length ? 'pb-44' : 'pb-28'}`}>
        <Outlet />
      </main>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-cream/90 backdrop-blur">
        {cooking.length > 0 && (
          <div className="mx-auto max-w-lg border-b border-line px-4 py-2">
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">En cuisine</p>
            <CookingChips />
          </div>
        )}
        <nav>
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
    </div>
  );
}
