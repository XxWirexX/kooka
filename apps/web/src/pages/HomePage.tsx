import { Compass, RefreshCw, Refrigerator } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { FilterBar } from '../components/FilterBar';
import { PageHeader } from '../components/PageHeader';
import { SuggestionCard, SuggestionSkeleton } from '../components/SuggestionCard';
import { useFilters, useSuggestions } from '../hooks/useSuggestions';

const LOADING_MESSAGES = [
  'Kooka fouille ton frigo…',
  'On évite de te proposer trois fois le même plat…',
  'On vérifie ce que tu as déjà…',
  'Presque prêt…',
];

export function HomePage() {
  const [filters, setFilters] = useFilters();
  const { data, isFetching, error, refetch, more, inventoryCount, isSuccess } = useSuggestions(filters);
  const discovery = filters.ignoreInventory ?? false;
  const needsInventory = !discovery && inventoryCount === 0;

  return (
    <>
      <PageHeader title="Qu'est-ce qu'on mange ?" subtitle="Achète ce qui te fait envie. Kooka s'occupe du reste." />
      <FilterBar filters={filters} onChange={setFilters} />

      {needsInventory ? (
        <EmptyInventory onDiscover={() => setFilters({ ...filters, ignoreInventory: true })} />
      ) : (
        <>
          <div className="space-y-4">
            {isFetching ? (
              <>
                <LoadingMessage />
                <SuggestionSkeleton />
                <SuggestionSkeleton />
                <SuggestionSkeleton />
              </>
            ) : error ? (
              <div className="rounded-3xl border border-tomato-soft bg-surface p-6 text-center">
                <p className="text-sm text-tomato-dark">{error.message}</p>
                <button onClick={() => refetch()} className="mt-3 text-sm font-semibold text-tomato-dark underline">
                  Réessayer
                </button>
              </div>
            ) : (
              data?.map((s, i) => <SuggestionCard key={s.id} suggestion={s} index={i} discovery={discovery} />)
            )}
          </div>

          {isSuccess && !isFetching && (
            <button
              onClick={more}
              className="mx-auto mt-6 flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold shadow-sm"
            >
              <RefreshCw size={16} /> Autres idées
            </button>
          )}
        </>
      )}
    </>
  );
}

function LoadingMessage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, LOADING_MESSAGES.length - 1)), 4000);
    return () => clearInterval(t);
  }, []);
  return <p className="text-center text-sm text-muted">{LOADING_MESSAGES[i]}</p>;
}

function EmptyInventory({ onDiscover }: { onDiscover: () => void }) {
  return (
    <section className="rounded-3xl bg-tomato p-6 text-cream shadow-lg shadow-tomato/20">
      <h2 className="font-display text-xl font-semibold">Dis à Kooka ce que tu as</h2>
      <p className="mt-1 text-sm text-cream/85">
        Ajoute quelques ingrédients, même sans quantités : Kooka te proposera des plats à partir de ce que tu as.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/inventaire"
          className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm font-semibold text-tomato-dark"
        >
          <Refrigerator size={18} /> Remplir mon inventaire
        </Link>
        <button
          onClick={onDiscover}
          className="inline-flex items-center gap-2 rounded-full border border-cream/50 px-4 py-2 text-sm font-semibold"
        >
          <Compass size={18} /> Découvrir sans inventaire
        </button>
      </div>
    </section>
  );
}
