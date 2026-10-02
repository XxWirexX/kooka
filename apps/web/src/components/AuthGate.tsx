import { Lock } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth, useLogin } from '../hooks/useAuth';

/** Affiche l'écran de connexion tant que l'utilisateur n'est pas connecté (si un mot de passe est configuré). */
export function AuthGate({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useAuth();

  if (isLoading) return null;
  if (error) {
    return <p className="p-8 text-center text-sm text-tomato-dark">Impossible de joindre Kooka : {error.message}</p>;
  }
  if (data?.required && !data.authenticated) return <LoginScreen />;
  return <>{children}</>;
}

function LoginScreen() {
  const [password, setPassword] = useState('');
  const login = useLogin();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password) login.mutate(password);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <img src="/icon-192.png" alt="" className="mx-auto size-20 rounded-3xl shadow-lg shadow-tomato/20" />
        <h1 className="mt-5 font-display text-3xl font-bold">Kooka</h1>
        <p className="mt-1 text-sm text-muted">Achète ce qui te fait envie. Kooka s'occupe du reste.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label className="flex items-center gap-3 rounded-full border border-line bg-surface px-5 py-3.5 focus-within:border-tomato">
          <Lock size={18} className="text-muted" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            autoComplete="current-password"
            autoFocus
            className="w-full bg-transparent outline-none"
          />
        </label>
        {login.error && <p className="px-2 text-sm text-tomato-dark">{login.error.message}</p>}
        <button
          type="submit"
          disabled={!password || login.isPending}
          className="w-full rounded-full bg-tomato py-3.5 font-semibold text-cream shadow-md shadow-tomato/30 disabled:opacity-50"
        >
          Entrer
        </button>
      </form>
    </div>
  );
}
