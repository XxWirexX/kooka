import { Outlet } from 'react-router';
import { useTimerAlarms } from '../lib/timers';

/** Racine de l'app : les alarmes des minuteurs fonctionnent sur toutes les pages. */
export function RootLayout() {
  useTimerAlarms();
  return <Outlet />;
}
